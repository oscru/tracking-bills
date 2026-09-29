-- Savings goals: not a real account, but you can "transfer" money into one
-- from a real account — that transfer is a normal `transactions` row (so the
-- source account's balance correctly drops), just pointed at a goal instead
-- of a destination account via the new `goal_id` column below.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  icon text not null check (char_length(icon) > 0),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  deadline date not null,
  -- Optional planned savings pace, e.g. "$500 every 15 days" — informational,
  -- not enforced. Either both are set or neither is.
  contribution_amount numeric(14, 2) check (contribution_amount is null or contribution_amount > 0),
  contribution_interval_days integer check (contribution_interval_days is null or contribution_interval_days > 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_contribution_pace_shape check (
    (contribution_amount is null) = (contribution_interval_days is null)
  )
);

comment on table public.goals is 'A savings target. Progress is the sum of `transactions` transferred into it (see `transactions.goal_id`), not stored here.';

create index goals_user_id_idx on public.goals (user_id);

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

alter table public.goals enable row level security;

create policy "Goals are viewable by their owner"
  on public.goals for select
  using ((select auth.uid()) = user_id);

create policy "Goals are insertable by their owner"
  on public.goals for insert
  with check ((select auth.uid()) = user_id);

create policy "Goals are updatable by their owner"
  on public.goals for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Goals are deletable by their owner"
  on public.goals for delete
  using ((select auth.uid()) = user_id);

-- A transfer's destination is now EITHER another account (`to_account_id`,
-- existing behavior, untouched) OR a goal (`goal_id`, new) — never both,
-- never neither, same as before for any non-transfer type.
alter table public.transactions
  add column goal_id uuid references public.goals (id) on delete restrict;

create index transactions_goal_id_idx on public.transactions (goal_id);

alter table public.transactions drop constraint transactions_transfer_shape;
alter table public.transactions add constraint transactions_transfer_shape check (
  (
    type = 'transfer'
    and category_id is null
    and (
      (to_account_id is not null and to_account_id <> account_id and goal_id is null)
      or (goal_id is not null and to_account_id is null)
    )
  )
  or (type <> 'transfer' and to_account_id is null and goal_id is null)
);

-- Extend the integrity trigger: a goal destination must belong to the same user.
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

  if new.to_account_id is not null and not exists (
    select 1 from public.accounts a
    where a.id = new.to_account_id and a.user_id = new.user_id
  ) then
    raise exception 'destination account % does not belong to user %',
      new.to_account_id, new.user_id
      using errcode = 'check_violation';
  end if;

  if new.goal_id is not null and not exists (
    select 1 from public.goals g
    where g.id = new.goal_id and g.user_id = new.user_id
  ) then
    raise exception 'goal % does not belong to user %', new.goal_id, new.user_id
      using errcode = 'check_violation';
  end if;

  if new.category_id is not null and not exists (
    select 1 from public.categories c
    where c.id = new.category_id
      and c.type = new.type
      and c.user_id = new.user_id
  ) then
    raise exception 'category % is not usable by user % for a % transaction',
      new.category_id, new.user_id, new.type
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
