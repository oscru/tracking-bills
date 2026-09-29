-- The "ingresos esperados" feature (expected income per budget period,
-- checked against total budgeted amounts) turned out not to be needed —
-- dropping it rather than leaving unreachable columns/UI around.

alter table public.profiles
  drop column expected_income_weekly,
  drop column expected_income_biweekly,
  drop column expected_income_monthly;
