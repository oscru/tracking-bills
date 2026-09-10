-- accounts: where money lives (cash, bank, credit card).

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  type text not null check (type in ('cash', 'bank', 'credit_card')),
  currency text not null default 'MXN' check (char_length(currency) = 3),
  initial_balance numeric(14, 2) not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.accounts is 'User financial accounts. Balance = initial_balance + sum of transactions.';

create index accounts_user_id_idx on public.accounts (user_id) where archived = false;

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- RLS: full CRUD, scoped to the owner.
alter table public.accounts enable row level security;

create policy "Accounts are viewable by their owner"
  on public.accounts for select
  using ((select auth.uid()) = user_id);

create policy "Accounts are insertable by their owner"
  on public.accounts for insert
  with check ((select auth.uid()) = user_id);

create policy "Accounts are updatable by their owner"
  on public.accounts for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Accounts are deletable by their owner"
  on public.accounts for delete
  using ((select auth.uid()) = user_id);
