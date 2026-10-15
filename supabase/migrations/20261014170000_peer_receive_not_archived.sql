-- A transfer sent to a linked person must not land in an account they've
-- archived: archiving only hides an account, so the money would sit there
-- unnoticed (and the archive rule — zero balance — was checked before it
-- arrived). Same function as in 20261014160000_peer_transfers.sql, with one
-- more condition on the receiving account: `not a.archived`. When it fails,
-- the sender gets the usual "no tiene una cuenta para recibir" message and
-- the recipient sees "Cuenta archivada" in Opciones › Personas.

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
      and not a.archived
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
