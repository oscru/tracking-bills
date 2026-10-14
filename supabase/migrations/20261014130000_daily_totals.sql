-- Per-day totals for Análisis' no-spend streaks, which need to know which
-- days of the WHOLE history had spending — a few rows per active day
-- instead of every transaction. Same approach as
-- 20261014120000_transaction_summaries.sql: a plain view, `security_invoker`
-- so the transactions RLS applies, grouped by the account's currency.
--
-- Every type and status gets a row (so the earliest day with any activity is
-- known — where a streak can start counting from), but `total` only sums
-- SETTLED rows, like everywhere else.
create view public.daily_totals
with (security_invoker = true)
as
select
  t.transaction_date as date,
  a.currency,
  t.type,
  coalesce(sum(t.amount) filter (where t.is_completed), 0)::numeric(14, 2) as total,
  count(*)::integer as count
from public.transactions t
join public.accounts a on a.id = t.account_id
group by 1, 2, 3;

comment on view public.daily_totals is
  'Per day, account currency and type: settled total and count of all rows.';

grant select on public.daily_totals to authenticated;
