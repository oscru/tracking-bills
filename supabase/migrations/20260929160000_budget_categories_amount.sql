-- A budget's total `amount` is a locked envelope the user then splits across
-- its categories — each `budget_categories` row now carries its own share.
-- The parts are expected to add up close to the whole, but aren't
-- database-enforced to match exactly (the app allows up to 10% over, with a
-- warning) — nothing here needs a CHECK tying the two together.
--
-- Backfill for any existing links: split the parent budget's amount evenly
-- across however many categories it already has.

alter table public.budget_categories add column amount numeric(14, 2);

update public.budget_categories bc
set amount = sub.share
from (
  select bc2.budget_id, b.amount / count(*) over (partition by bc2.budget_id) as share
  from public.budget_categories bc2
  join public.budgets b on b.id = bc2.budget_id
) sub
where bc.budget_id = sub.budget_id
  and bc.amount is null;

alter table public.budget_categories
  alter column amount set not null,
  add constraint budget_categories_amount_check check (amount > 0);

comment on column public.budget_categories.amount is 'This category''s share of the parent budget''s total amount.';
