-- tags: freeform labels a user can attach to any transaction (income, expense,
-- or transfer) — e.g. "vacaciones", "remodelación". Many-to-many via
-- transaction_tags. Archiving (not deleting) is how a user retires a tag they
-- no longer use without losing the history on already-tagged transactions.

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  color text check (color is null or color ~* '^#[0-9a-f]{6}$'),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tags is 'User-defined labels attachable to any transaction. Retired via `archived`, not deleted, so history stays intact.';

-- A user can't have two tags sharing the same name (case-insensitive; NULLs n/a).
create unique index tags_user_name_key on public.tags (user_id, lower(name));
create index tags_user_id_idx on public.tags (user_id);

create trigger tags_set_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();

alter table public.tags enable row level security;

create policy "Tags are viewable by their owner"
  on public.tags for select
  using ((select auth.uid()) = user_id);

create policy "Tags are insertable by their owner"
  on public.tags for insert
  with check ((select auth.uid()) = user_id);

create policy "Tags are updatable by their owner"
  on public.tags for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Tags are deletable by their owner"
  on public.tags for delete
  using ((select auth.uid()) = user_id);

-- transaction_tags: the many-to-many join. No update policy — callers add/remove
-- rows rather than mutate one, so there's nothing to update.
create table public.transaction_tags (
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (transaction_id, tag_id)
);

comment on table public.transaction_tags is 'Many-to-many link between transactions and tags.';

create index transaction_tags_tag_id_idx on public.transaction_tags (tag_id);

-- Integrity: the referenced transaction and tag must both belong to the same
-- user. RLS hides other users' rows but does not stop a crafted request from
-- pointing at them, so enforce it here (same pattern as check_transaction_refs).
create or replace function public.check_transaction_tag_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.transactions t
    where t.id = new.transaction_id and t.user_id = new.user_id
  ) then
    raise exception 'transaction % does not belong to user %', new.transaction_id, new.user_id
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.tags tg
    where tg.id = new.tag_id and tg.user_id = new.user_id
  ) then
    raise exception 'tag % does not belong to user %', new.tag_id, new.user_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger transaction_tags_check_refs
  before insert or update on public.transaction_tags
  for each row execute function public.check_transaction_tag_refs();

alter table public.transaction_tags enable row level security;

create policy "Transaction tags are viewable by their owner"
  on public.transaction_tags for select
  using ((select auth.uid()) = user_id);

create policy "Transaction tags are insertable by their owner"
  on public.transaction_tags for insert
  with check ((select auth.uid()) = user_id);

create policy "Transaction tags are deletable by their owner"
  on public.transaction_tags for delete
  using ((select auth.uid()) = user_id);
