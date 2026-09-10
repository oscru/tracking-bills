-- transactions: the core ledger. Sign is derived from `type`, so `amount` > 0.

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount > 0),
  description text check (description is null or char_length(description) <= 280),
  transaction_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.transactions is 'Income/expense entries. amount is always positive; direction comes from type.';

create index transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);
create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_category_id_idx on public.transactions (category_id);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- Integrity: the referenced account must belong to the same user, and the
-- category must be a system default or owned by the same user, with a matching
-- income/expense type. RLS hides other users' rows but does not stop a crafted
-- request from pointing at them, so enforce it here.
create or replace function public.check_transaction_refs()
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

  if new.category_id is not null and not exists (
    select 1 from public.categories c
    where c.id = new.category_id
      and c.type = new.type
      and (c.is_default or c.user_id = new.user_id)
  ) then
    raise exception 'category % is not usable by user % for a % transaction',
      new.category_id, new.user_id, new.type
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger transactions_check_refs
  before insert or update on public.transactions
  for each row execute function public.check_transaction_refs();

-- RLS: full CRUD, scoped to the owner.
alter table public.transactions enable row level security;

create policy "Transactions are viewable by their owner"
  on public.transactions for select
  using ((select auth.uid()) = user_id);

create policy "Transactions are insertable by their owner"
  on public.transactions for insert
  with check ((select auth.uid()) = user_id);

create policy "Transactions are updatable by their owner"
  on public.transactions for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Transactions are deletable by their owner"
  on public.transactions for delete
  using ((select auth.uid()) = user_id);
