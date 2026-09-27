-- favorite_transactions: user-defined shortcuts for transactions they log
-- often (e.g. "Café", "Renta") — a saved template, not a historical record.
-- Tapping one prefills the movement form so the user doesn't retype the same
-- account/category/description every time. `amount` is nullable: null means
-- "monto libre" (left for the user to type each time), set means a default
-- (still editable before saving, e.g. a fixed rent payment).

create table public.favorite_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 40),
  icon text not null check (char_length(icon) > 0),
  type text not null check (type in ('income', 'expense', 'transfer')),
  account_id uuid not null references public.accounts (id) on delete cascade,
  to_account_id uuid references public.accounts (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  amount numeric(14, 2) check (amount is null or amount > 0),
  description text check (description is null or char_length(description) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.favorite_transactions is 'User-defined shortcuts that prefill the movement form. Not historical data — unlike transactions, deleting the account/category it points at removes or clears it instead of being restricted.';

-- Same transfer shape as `transactions`: a transfer needs a distinct destination
-- account and no category; anything else needs neither.
alter table public.favorite_transactions add constraint favorite_transactions_transfer_shape check (
  (
    type = 'transfer'
    and to_account_id is not null
    and to_account_id <> account_id
    and category_id is null
  )
  or (type <> 'transfer' and to_account_id is null)
);

create index favorite_transactions_user_id_idx on public.favorite_transactions (user_id, created_at);
create index favorite_transactions_account_id_idx on public.favorite_transactions (account_id);
create index favorite_transactions_to_account_id_idx on public.favorite_transactions (to_account_id);
create index favorite_transactions_category_id_idx on public.favorite_transactions (category_id);

create trigger favorite_transactions_set_updated_at
  before update on public.favorite_transactions
  for each row execute function public.set_updated_at();

-- Integrity: every referenced account/category must belong to the same user,
-- and a category must match the favorite's own type. Same pattern as
-- `check_transaction_refs` — RLS hides other users' rows but doesn't stop a
-- crafted request from pointing at them.
create or replace function public.check_favorite_transaction_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.accounts a
    where a.id = new.account_id and a.user_id = new.user_id
  ) then
    raise exception 'account % does not belong to user %', new.account_id, new.user_id
      using errcode = 'check_violation';
  end if;

  if new.to_account_id is not null and not exists (
    select 1 from public.accounts a
    where a.id = new.to_account_id and a.user_id = new.user_id
  ) then
    raise exception 'destination account % does not belong to user %',
      new.to_account_id, new.user_id
      using errcode = 'check_violation';
  end if;

  if new.category_id is not null and not exists (
    select 1 from public.categories c
    where c.id = new.category_id
      and c.type = new.type
      and c.user_id = new.user_id
  ) then
    raise exception 'category % is not usable by user % for a % favorite',
      new.category_id, new.user_id, new.type
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger favorite_transactions_check_refs
  before insert or update on public.favorite_transactions
  for each row execute function public.check_favorite_transaction_refs();

-- RLS: full CRUD, scoped to the owner.
alter table public.favorite_transactions enable row level security;

create policy "Favorite transactions are viewable by their owner"
  on public.favorite_transactions for select
  using ((select auth.uid()) = user_id);

create policy "Favorite transactions are insertable by their owner"
  on public.favorite_transactions for insert
  with check ((select auth.uid()) = user_id);

create policy "Favorite transactions are updatable by their owner"
  on public.favorite_transactions for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Favorite transactions are deletable by their owner"
  on public.favorite_transactions for delete
  using ((select auth.uid()) = user_id);
