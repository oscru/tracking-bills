-- What the user expects to earn per period, one figure per budget period
-- type (weekly/biweekly/monthly) rather than a single normalized monthly
-- number — so "¿cuánto llevo asignado?" can be checked against whichever
-- income figure actually matches how a given budget repeats, with no lossy
-- weekly<->monthly conversion. Null = not set; the allocation check for that
-- period type is simply skipped.

alter table public.profiles
  add column expected_income_weekly numeric(14, 2) check (expected_income_weekly is null or expected_income_weekly > 0),
  add column expected_income_biweekly numeric(14, 2) check (expected_income_biweekly is null or expected_income_biweekly > 0),
  add column expected_income_monthly numeric(14, 2) check (expected_income_monthly is null or expected_income_monthly > 0);

comment on column public.profiles.expected_income_weekly is 'Expected income per week, for checking weekly budgets against it. Null = not set.';
comment on column public.profiles.expected_income_biweekly is 'Expected income per quincena, for checking biweekly budgets against it. Null = not set.';
comment on column public.profiles.expected_income_monthly is 'Expected income per month, for checking monthly budgets against it. Null = not set.';
