-- Pre-aggregated views over the ledger, so screens that only need totals
-- (Inicio, the trend charts) stop downloading and re-scanning the user's
-- whole transaction history on the device.
--
-- Plain (not materialized) views: Postgres aggregates them per request
-- using the existing (user_id, transaction_date) index — milliseconds even
-- for years of history — and they can never go stale. `security_invoker`
-- makes them run with the CALLER's permissions, so the transactions RLS
-- policies (owner only) apply exactly as on the table itself.
--
-- Both follow the app's rules (packages/core/src/utils):
--   * only SETTLED rows count (`is_completed`), like `accountBalance`;
--   * amounts are grouped by the account's currency, never blended.

-- Net effect of every settled transaction on each account — the client adds
-- the account's own `initial_balance` (kept out of here so editing an
-- account doesn't depend on this view's cache). Mirrors `accountBalances`:
--   income +amount, expense −amount on `account_id`;
--   transfer −amount on `account_id`, +amount on `to_account_id`
--   (a transfer into a virtual goal has no `to_account_id`: money leaves).
create view public.account_balance_effects
with (security_invoker = true)
as
select account_id, sum(delta)::numeric(14, 2) as net
from (
  select
    t.account_id,
    case when t.type = 'income' then t.amount else -t.amount end as delta
  from public.transactions t
  where t.is_completed
  union all
  select t.to_account_id, t.amount
  from public.transactions t
  where t.is_completed and t.type = 'transfer' and t.to_account_id is not null
) effects
group by account_id;

comment on view public.account_balance_effects is
  'Per-account net of settled transactions (add accounts.initial_balance for the balance).';

-- Settled income/expense per month, account currency and category — small
-- (months × categories) and enough for the month's income/expense totals,
-- the spend-by-category breakdown and the monthly trend.
create view public.monthly_category_totals
with (security_invoker = true)
as
select
  to_char(t.transaction_date, 'YYYY-MM') as month,
  a.currency,
  t.type,
  t.category_id,
  sum(t.amount)::numeric(14, 2) as total,
  count(*)::integer as count
from public.transactions t
join public.accounts a on a.id = t.account_id
where t.is_completed and t.type in ('income', 'expense')
group by 1, 2, 3, 4;

comment on view public.monthly_category_totals is
  'Settled income/expense totals per month (YYYY-MM), account currency and category.';

grant select on public.account_balance_effects to authenticated;
grant select on public.monthly_category_totals to authenticated;
