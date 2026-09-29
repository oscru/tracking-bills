-- Reworks budgets from "one category, one limit" into "a named envelope that
-- spans several categories" (e.g. "Comida y entretenimiento"), since a
-- category can now belong to several budgets at once. The category link
-- moves to a new `budget_categories` join table. Also adds a 'custom' period
-- — a one-off, explicit date range — alongside the existing recurring
-- weekly/biweekly/monthly types, which still derive their current occurrence
-- from `today` (see `budgetPeriodRange` in @repo/core/utils).
--
-- Any existing row predates `name` and `budget_categories`, so this backfills
-- both from the row's own `category_id` (naming the budget after its one
-- category, and linking that category in the new join table) before dropping
-- `category_id` — no data is discarded.

create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (budget_id, category_id)
);

comment on table public.budget_categories is 'Which categories count toward a budget''s spend. A category may belong to several budgets at once.';

create index budget_categories_budget_id_idx on public.budget_categories (budget_id);
create index budget_categories_category_id_idx on public.budget_categories (category_id);

insert into public.budget_categories (budget_id, category_id)
select id, category_id from public.budgets;

alter table public.budgets add column name text;
alter table public.budgets add column start_date date;
alter table public.budgets add column end_date date;

update public.budgets b
set name = coalesce(c.name, 'Presupuesto')
from public.categories c
where c.id = b.category_id;

alter table public.budgets
  alter column name set not null,
  add constraint budgets_name_check check (char_length(trim(name)) between 1 and 60);

alter table public.budgets drop constraint budgets_period_type_check;
alter table public.budgets drop constraint budgets_user_id_category_id_key;
drop trigger budgets_check_refs on public.budgets;
drop function public.check_budget_refs();
alter table public.budgets drop column category_id;

alter table public.budgets
  add constraint budgets_period_type_check
    check (period_type in ('weekly', 'biweekly', 'monthly', 'custom')),
  add constraint budgets_custom_range_shape check (
    (period_type = 'custom' and start_date is not null and end_date is not null and end_date >= start_date)
    or (period_type <> 'custom' and start_date is null and end_date is null)
  );

comment on table public.budgets is 'A named, recurring (or one-off custom-range) spending envelope covering one or more categories — see `budget_categories`. Progress for the current period is computed client-side from transactions, not stored.';

-- Integrity: a linked category must be an expense category belonging to the
-- same user as the budget. No `user_id` column here — it's looked up via the
-- parent budget, same as the RLS policies below.
create or replace function public.check_budget_category_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.budgets where id = new.budget_id;

  if not exists (
    select 1 from public.categories c
    where c.id = new.category_id
      and c.type = 'expense'
      and c.user_id = v_user_id
  ) then
    raise exception 'category % is not a usable expense category for budget %''s owner',
      new.category_id, new.budget_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger budget_categories_check_refs
  before insert or update on public.budget_categories
  for each row execute function public.check_budget_category_refs();

alter table public.budget_categories enable row level security;

create policy "Budget categories are viewable by their budget's owner"
  on public.budget_categories for select
  using (exists (
    select 1 from public.budgets b where b.id = budget_id and b.user_id = (select auth.uid())
  ));

create policy "Budget categories are insertable by their budget's owner"
  on public.budget_categories for insert
  with check (exists (
    select 1 from public.budgets b where b.id = budget_id and b.user_id = (select auth.uid())
  ));

create policy "Budget categories are deletable by their budget's owner"
  on public.budget_categories for delete
  using (exists (
    select 1 from public.budgets b where b.id = budget_id and b.user_id = (select auth.uid())
  ));
