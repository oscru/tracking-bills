-- Transfers between linked people (a couple, a household).
--
-- Each person keeps their own ledger; nothing is shared. A linked person is
-- represented in each ledger by a hidden "contact" account (`type =
-- 'contact'`, one per currency):
--   * I send:   transfer  my account  -> my contact "Ana"
--   * mirrored: transfer  Ana's contact "Oscar" -> Ana's receiving account
-- The mirror is created (and kept in sync) by the database, so Ana never
-- has to record it. Both rows are plain transfers, so neither side counts it
-- as income or expense, and every balance computation already in place
-- (app + views + account_net_before + archive check) moves the money
-- correctly. A contact account's balance is the net sent between the two.
--
-- Writes that only the sync may do (creating contact accounts, inserting or
-- changing mirrors) are gated on a transaction-local flag, `app.peer_sync`,
-- which only the security-definer functions below set.

-- --- links between people ------------------------------------------------------

create table public.peer_links (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid references public.profiles (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (invitee_id is null or invitee_id <> inviter_id)
);

comment on table public.peer_links is
  'A link between two users that lets them send each other transfers. Pending until the invitee redeems `code`.';

create index peer_links_inviter_idx on public.peer_links (inviter_id);
create index peer_links_invitee_idx on public.peer_links (invitee_id);

alter table public.peer_links enable row level security;

-- Read-only to the app: every write goes through the functions below.
create policy "Peer links are viewable by their participants"
  on public.peer_links for select
  using ((select auth.uid()) in (inviter_id, invitee_id));

-- Whether two users are currently linked.
create or replace function public.peers_are_linked(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.peer_links l
    where l.status = 'accepted'
      and ((l.inviter_id = p_a and l.invitee_id = p_b) or (l.inviter_id = p_b and l.invitee_id = p_a))
  );
$$;

-- --- contact accounts ----------------------------------------------------------

alter table public.accounts drop constraint accounts_type_check;
alter table public.accounts
  add constraint accounts_type_check
  check (type in ('investment', 'credit', 'debit', 'savings', 'loan', 'cash', 'credit_card', 'contact'));

alter table public.accounts
  add column peer_user_id uuid references public.profiles (id) on delete set null,
  add column receive_into_account_id uuid references public.accounts (id) on delete set null;

comment on column public.accounts.peer_user_id is
  'Contact accounts only: the linked person this account stands for.';
comment on column public.accounts.receive_into_account_id is
  'Contact accounts only: the owner''s own account that money from this person (in this currency) lands in.';

create unique index accounts_contact_unique
  on public.accounts (user_id, peer_user_id, currency)
  where type = 'contact';

-- Contact accounts are managed by the sync only: the app can't create one,
-- turn an account into one (or back), or repoint it at someone else.
create or replace function public.check_contact_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.peer_sync', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' and new.type = 'contact' then
    raise exception 'contact accounts are created by linking people'
      using errcode = 'check_violation';
  end if;
  -- Clearing them is fine: that's their FKs' `on delete set null` (the
  -- person deleted their account, or the receiving account was deleted).
  if tg_op = 'UPDATE' and (
    new.type is distinct from old.type
    or (new.peer_user_id is distinct from old.peer_user_id and new.peer_user_id is not null)
    or (new.receive_into_account_id is distinct from old.receive_into_account_id
        and new.receive_into_account_id is not null)
  ) then
    raise exception 'contact account fields are managed by linking people'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger accounts_check_contact
  before insert or update on public.accounts
  for each row execute function public.check_contact_account();

-- The contact account `p_owner` has for `p_peer` in `p_currency`, created
-- on first use. Callers must already have checked the two are linked.
create or replace function public.ensure_contact_account(p_owner uuid, p_peer uuid, p_currency text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_name text;
begin
  select id into v_id from public.accounts
    where user_id = p_owner and peer_user_id = p_peer and currency = p_currency and type = 'contact';
  if v_id is not null then
    return v_id;
  end if;

  select left(coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1), 'Contacto'), 60)
    into v_name
    from public.profiles p where p.id = p_peer;

  perform set_config('app.peer_sync', 'on', true);
  insert into public.accounts
    (user_id, name, type, currency, initial_balance, peer_user_id, include_in_total, show_on_home)
  values
    (p_owner, coalesce(v_name, 'Contacto'), 'contact', p_currency, 0, p_peer, false, false)
  returning id into v_id;
  perform set_config('app.peer_sync', 'off', true);
  return v_id;
end;
$$;

-- --- transactions: mirror links ------------------------------------------------

alter table public.transactions
  add column peer_transaction_id uuid references public.transactions (id) on delete set null,
  add column is_peer_mirror boolean not null default false;

comment on column public.transactions.peer_transaction_id is
  'Transfers between linked people: the other side''s row (the mirror, or the original it mirrors).';
comment on column public.transactions.is_peer_mirror is
  'Created by the database in the recipient''s ledger, mirroring a transfer someone sent them.';

create index transactions_peer_transaction_idx on public.transactions (peer_transaction_id)
  where peer_transaction_id is not null;

-- Rules for rows touching contact accounts, before they're written:
--   * a contact account is only ever a transfer's DESTINATION in your own
--     rows (sending), and only a SOURCE in a mirror (receiving);
--   * sending requires the two people to still be linked;
--   * a mirror's amount/date/status/description come from the sender — the
--     recipient may only move it to another of their accounts.
create or replace function public.check_peer_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from_contact boolean;
  v_to_peer uuid;
begin
  if coalesce(current_setting('app.peer_sync', true), '') = 'on'
    or coalesce(current_setting('app.deleting_own_account', true), '') = 'true' then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    if old.is_peer_mirror and old.peer_transaction_id is not null then
      raise exception 'a received transfer can only be removed by whoever sent it'
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.is_peer_mirror and old.peer_transaction_id is not null then
    if new.amount is distinct from old.amount
      or new.transaction_date is distinct from old.transaction_date
      or new.is_completed is distinct from old.is_completed
      or new.description is distinct from old.description
      or new.type is distinct from old.type
      or new.account_id is distinct from old.account_id
      or new.is_peer_mirror is distinct from old.is_peer_mirror
      or (new.peer_transaction_id is distinct from old.peer_transaction_id
          and new.peer_transaction_id is not null) then
      raise exception 'a received transfer can only be changed by whoever sent it'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.is_peer_mirror is distinct from (case when tg_op = 'UPDATE' then old.is_peer_mirror else false end) then
    raise exception 'is_peer_mirror is managed by the database'
      using errcode = 'check_violation';
  end if;

  select (a.type = 'contact') into v_from_contact from public.accounts a where a.id = new.account_id;
  if coalesce(v_from_contact, false) and not new.is_peer_mirror then
    raise exception 'money from a linked person arrives on its own — it can''t be recorded by hand'
      using errcode = 'check_violation';
  end if;

  if new.to_account_id is not null then
    select a.peer_user_id into v_to_peer
      from public.accounts a where a.id = new.to_account_id and a.type = 'contact';
    if v_to_peer is not null and not public.peers_are_linked(new.user_id, v_to_peer) then
      raise exception 'you are no longer linked with this person'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger transactions_check_peer
  before insert or update or delete on public.transactions
  for each row execute function public.check_peer_transaction();

-- Keeps the recipient's mirror in step with what the sender recorded.
create or replace function public.sync_peer_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peer uuid;
  v_currency text;
  v_contact uuid;
  v_receive uuid;
  v_mirror uuid;
  v_sender_name text;
begin
  -- Mirrors never propagate anything back.
  if tg_op <> 'DELETE' and new.is_peer_mirror then
    return null;
  end if;
  if tg_op = 'DELETE' and old.is_peer_mirror then
    return null;
  end if;

  -- Removing the sender's row removes the mirror — except when the sender is
  -- deleting their whole account: the recipient keeps that history (the
  -- link column is nulled by its FK, which also unlocks the mirror).
  if tg_op = 'DELETE' then
    if old.peer_transaction_id is not null
      and coalesce(current_setting('app.deleting_own_account', true), '') <> 'true' then
      perform set_config('app.peer_sync', 'on', true);
      delete from public.transactions where id = old.peer_transaction_id and is_peer_mirror;
      perform set_config('app.peer_sync', 'off', true);
    end if;
    return null;
  end if;

  -- Who (if anyone) this transfer is sent to.
  if new.type = 'transfer' and new.to_account_id is not null then
    select a.peer_user_id, a.currency into v_peer, v_currency
      from public.accounts a where a.id = new.to_account_id and a.type = 'contact';
  end if;

  if tg_op = 'UPDATE' then
    -- Only the fields a mirror copies matter; anything else is a no-op.
    if new.to_account_id is not distinct from old.to_account_id
      and new.amount is not distinct from old.amount
      and new.transaction_date is not distinct from old.transaction_date
      and new.is_completed is not distinct from old.is_completed
      and new.description is not distinct from old.description
      and new.type is not distinct from old.type then
      return null;
    end if;

    -- Same recipient: update the mirror in place.
    if old.peer_transaction_id is not null and v_peer is not null
      and new.to_account_id is not distinct from old.to_account_id then
      perform set_config('app.peer_sync', 'on', true);
      update public.transactions
        set amount = new.amount,
            transaction_date = new.transaction_date,
            is_completed = new.is_completed,
            description = new.description
        where id = old.peer_transaction_id and is_peer_mirror;
      perform set_config('app.peer_sync', 'off', true);
      return null;
    end if;

    -- Recipient changed (or it's no longer sent to anyone): drop the old mirror.
    if old.peer_transaction_id is not null then
      perform set_config('app.peer_sync', 'on', true);
      delete from public.transactions where id = old.peer_transaction_id and is_peer_mirror;
      update public.transactions set peer_transaction_id = null where id = new.id;
      perform set_config('app.peer_sync', 'off', true);
    end if;
  end if;

  if v_peer is null then
    return null;
  end if;

  -- Create the mirror in the recipient's ledger.
  v_contact := public.ensure_contact_account(v_peer, new.user_id, v_currency);
  select receive_into_account_id into v_receive from public.accounts where id = v_contact;
  if v_receive is null or not exists (
    select 1 from public.accounts a
    where a.id = v_receive and a.user_id = v_peer and a.currency = v_currency and a.type <> 'contact'
  ) then
    select left(coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1)), 60)
      into v_sender_name from public.profiles p where p.id = v_peer;
    raise exception 'peer_no_receive_account:%:%', v_currency, coalesce(v_sender_name, '')
      using errcode = 'check_violation',
            hint = 'The recipient has no account set to receive this currency.';
  end if;

  perform set_config('app.peer_sync', 'on', true);
  insert into public.transactions
    (user_id, account_id, to_account_id, type, amount, description, transaction_date,
     is_completed, is_peer_mirror, peer_transaction_id)
  values
    (v_peer, v_contact, v_receive, 'transfer', new.amount, new.description, new.transaction_date,
     new.is_completed, true, new.id)
  returning id into v_mirror;
  update public.transactions set peer_transaction_id = v_mirror where id = new.id;
  perform set_config('app.peer_sync', 'off', true);
  return null;
end;
$$;

create trigger transactions_sync_peer
  after insert or update or delete on public.transactions
  for each row execute function public.sync_peer_transaction();

-- --- RPCs for the app ----------------------------------------------------------

-- A fresh 6-character invite code (no ambiguous 0/O/1/I).
create or replace function public.create_peer_invite()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;
  -- One open invite at a time: replace any older pending one.
  delete from public.peer_links where inviter_id = v_me and status = 'pending';
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      insert into public.peer_links (inviter_id, code) values (v_me, v_code);
      return v_code;
    exception when unique_violation then
      -- try another code
    end;
  end loop;
end;
$$;

-- Redeems an invite: links the two people and sets where the redeemer
-- receives money from the inviter (in that account's currency).
create or replace function public.accept_peer_invite(p_code text, p_receive_account_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_link public.peer_links;
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;
  select * into v_link from public.peer_links
    where code = upper(trim(p_code)) and status = 'pending' and expires_at > now()
    for update;
  if v_link.id is null then
    raise exception 'peer_invite_invalid' using errcode = 'check_violation';
  end if;
  if v_link.inviter_id = v_me then
    raise exception 'peer_invite_own' using errcode = 'check_violation';
  end if;
  if public.peers_are_linked(v_me, v_link.inviter_id) then
    raise exception 'peer_already_linked' using errcode = 'check_violation';
  end if;

  update public.peer_links
    set invitee_id = v_me, status = 'accepted', accepted_at = now()
    where id = v_link.id;
  perform public.set_peer_receive_account(v_link.inviter_id, p_receive_account_id);
  return v_link.inviter_id;
end;
$$;

-- Where money from `p_peer` lands, for the currency of `p_account_id`.
create or replace function public.set_peer_receive_account(p_peer uuid, p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_currency text;
  v_contact uuid;
begin
  if not public.peers_are_linked(v_me, p_peer) then
    raise exception 'you are not linked with this person' using errcode = 'check_violation';
  end if;
  select currency into v_currency from public.accounts
    where id = p_account_id and user_id = v_me and type <> 'contact' and not archived;
  if v_currency is null then
    raise exception 'account % is not one of your active accounts', p_account_id
      using errcode = 'check_violation';
  end if;
  v_contact := public.ensure_contact_account(v_me, p_peer, v_currency);
  perform set_config('app.peer_sync', 'on', true);
  update public.accounts set receive_into_account_id = p_account_id where id = v_contact;
  perform set_config('app.peer_sync', 'off', true);
end;
$$;

-- The caller's contact account for `p_peer` in `p_currency` (to send to).
create or replace function public.peer_contact_account(p_peer uuid, p_currency text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if not public.peers_are_linked(v_me, p_peer) then
    raise exception 'you are not linked with this person' using errcode = 'check_violation';
  end if;
  return public.ensure_contact_account(v_me, p_peer, upper(p_currency));
end;
$$;

-- Ends a link (either side). History stays: contact accounts and every
-- transfer remain, but no new transfers can be sent.
create or replace function public.unlink_peer(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.peer_links
    where id = p_link_id and (select auth.uid()) in (inviter_id, invitee_id);
end;
$$;

-- The caller's links, with the other person's display name — without
-- exposing the rest of their profile.
create or replace function public.linked_peers()
returns table (
  link_id uuid,
  peer_id uuid,
  peer_name text,
  status text,
  code text,
  expires_at timestamptz,
  is_inviter boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id,
    case when l.inviter_id = (select auth.uid()) then l.invitee_id else l.inviter_id end,
    (select left(coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1)), 60)
       from public.profiles p
       where p.id = case when l.inviter_id = (select auth.uid()) then l.invitee_id else l.inviter_id end),
    l.status,
    case when l.inviter_id = (select auth.uid()) then l.code end,
    l.expires_at,
    l.inviter_id = (select auth.uid())
  from public.peer_links l
  where (select auth.uid()) in (l.inviter_id, l.invitee_id)
    and (l.status = 'accepted' or l.expires_at > now())
  order by l.status, l.created_at desc;
$$;

revoke execute on function public.ensure_contact_account(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.peers_are_linked(uuid, uuid) from public, anon;
grant execute on function public.create_peer_invite() to authenticated;
grant execute on function public.accept_peer_invite(text, uuid) to authenticated;
grant execute on function public.set_peer_receive_account(uuid, uuid) to authenticated;
grant execute on function public.peer_contact_account(uuid, text) to authenticated;
grant execute on function public.unlink_peer(uuid) to authenticated;
grant execute on function public.linked_peers() to authenticated;
