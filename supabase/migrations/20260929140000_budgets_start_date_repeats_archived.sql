-- Reframes what weekly/biweekly/monthly mean: they're the SIZE of a budget's
-- range (7 / 15 / ~30 days), not "it repeats automatically". Every budget now
-- has an explicit `start_date` it's anchored to (the app defaults this to
-- today, but it's a real stored value, not derived), and repetition is its
-- own opt-in `repeats` flag — a weekly budget with `repeats = false` is a
-- single one-off week starting at `start_date`, same shape as a 'custom'
-- budget but sized instead of explicitly ranged. 'custom' can never repeat.
--
-- Also adds `archived`, so a budget can be retired without losing its
-- history — same rationale as categories/tags/accounts.

alter table public.budgets
  add column repeats boolean not null default false,
  add column archived boolean not null default false;

-- Drop the old constraint BEFORE backfilling `start_date` below — it required
-- non-custom rows to have `start_date is null`, which the backfill deliberately violates.
alter table public.budgets drop constraint budgets_custom_range_shape;

-- Backfill existing rows (created under the old "always recurring,
-- calendar-anchored" model): anchor them to today, and preserve their old
-- always-recurring behavior for anything non-custom.
update public.budgets set start_date = current_date where start_date is null;
update public.budgets set repeats = true where period_type <> 'custom';

alter table public.budgets alter column start_date set not null;

alter table public.budgets add constraint budgets_custom_shape check (
  (period_type = 'custom' and repeats = false and end_date is not null and end_date >= start_date)
  or (period_type <> 'custom' and end_date is null)
);

comment on column public.budgets.start_date is 'What date this budget''s range (or, if repeating, its first occurrence) starts on.';
comment on column public.budgets.repeats is 'Whether a new occurrence of the same size starts right after the previous one ends. Always false for period_type = ''custom''.';
comment on column public.budgets.archived is 'Retired without deleting — hidden from active views, kept for history.';
