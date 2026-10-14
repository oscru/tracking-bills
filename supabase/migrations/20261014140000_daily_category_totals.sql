-- Per-day, per-category totals for a category's detail screen (its spend
-- chart by day/month/year, range comparisons, subcategory chips) — queried
-- with `category_id in (…)`, so a category's whole history comes back as a
-- row per day it was used instead of every transaction. Same approach as
-- 20261014120000_transaction_summaries.sql: a plain view, `security_invoker`
-- so the transactions RLS applies, grouped by the account's currency.
--
-- Every status gets a row (`count` — "does this category have movements?",
-- which blocks deleting it), but `total` only sums SETTLED rows.
create view public.daily_category_totals
with (security_invoker = true)
as
select
  t.transaction_date as date,
  a.currency,
  t.category_id,
  coalesce(sum(t.amount) filter (where t.is_completed), 0)::numeric(14, 2) as total,
  count(*)::integer as count
from public.transactions t
join public.accounts a on a.id = t.account_id
where t.category_id is not null
group by 1, 2, 3;

comment on view public.daily_category_totals is
  'Per day, account currency and category: settled total and count of all rows.';

grant select on public.daily_category_totals to authenticated;
