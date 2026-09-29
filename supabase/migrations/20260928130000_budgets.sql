-- budgets: a recurring spending limit the user sets per category. Always
-- expense-scoped (budgeting an income category doesn't map to a limit).
-- Recurring by design — there's no start/end date range to manage: the
-- current occurrence of `period_type` is derived at read time from
-- `created_at`/"today", the same way `budgetPeriodRange` computes it in
-- `@repo/core/utils`. "biweekly" is calendar days 1-15 and 16-end of month
-- (Mexican payroll cutoff), not a rolling 14-day window.

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  period_type text not null check (period_type in ('weekly', 'biweekly', 'monthly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One budget per category — editing replaces it rather than stacking.
  unique (user_id, category_id)
);

comment on table public.budgets is 'A recurring per-category spending limit. Always expense-scoped; progress for the current period is computed client-side from transactions, not stored.';

create index budgets_user_id_idx on public.budgets (user_id);
create index budgets_category_id_idx on public.budgets (category_id);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- Integrity: the category must belong to the same user and be an expense
-- category. Same pattern as `check_favorite_transaction_refs`.
create or replace function public.check_budget_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.categories c
    where c.id = new.category_id
      and c.type = 'expense'
      and c.user_id = new.user_id
  ) then
    raise exception 'category % is not a usable expense category for user %',
      new.category_id, new.user_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger budgets_check_refs
  before insert or update on public.budgets
  for each row execute function public.check_budget_refs();

-- RLS: full CRUD, scoped to the owner.
alter table public.budgets enable row level security;

create policy "Budgets are viewable by their owner"
  on public.budgets for select
  using ((select auth.uid()) = user_id);

create policy "Budgets are insertable by their owner"
  on public.budgets for insert
  with check ((select auth.uid()) = user_id);

create policy "Budgets are updatable by their owner"
  on public.budgets for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Budgets are deletable by their owner"
  on public.budgets for delete
  using ((select auth.uid()) = user_id);
