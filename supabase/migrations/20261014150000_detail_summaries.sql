-- Aggregates for detail screens that used to download the whole history:
-- the tags screens (how many movements carry each tag) and a movement's
-- detail (its account's balance right before it). Same rules as the app
-- (packages/core/src/utils): balances only count SETTLED movements.

-- How many income/expense movements carry each tag (any status; transfers
-- aren't counted, like `tagCounts`). `security_invoker`, so the RLS of
-- transactions and transaction_tags applies.
create view public.tag_transaction_counts
with (security_invoker = true)
as
select tt.tag_id, t.type, count(*)::integer as count
from public.transaction_tags tt
join public.transactions t on t.id = tt.transaction_id
where t.type in ('income', 'expense')
group by tt.tag_id, t.type;

comment on view public.tag_transaction_counts is
  'Income/expense movement counts per tag (any status).';

grant select on public.tag_transaction_counts to authenticated;

-- An account's net of settled movements strictly before a point in the
-- ledger — (date, created_at), the same order the movement detail uses —
-- or of all of them when `p_date` is null. Add the account's
-- `initial_balance` for its balance at that point. Mirrors `accountBalance`:
-- income +, expense −, transfer − on `account_id` and + on `to_account_id`
-- (never both: a transfer can't target its own account).
-- `security invoker` (the default), so the transactions RLS applies.
create function public.account_net_before(
  p_account_id uuid,
  p_date date default null,
  p_created_at timestamptz default null
)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(
    case
      when t.account_id = p_account_id then
        case when t.type = 'income' then t.amount else -t.amount end
      else t.amount -- a transfer into this account
    end
  ), 0)::numeric(14, 2)
  from public.transactions t
  where t.is_completed
    and (
      t.account_id = p_account_id
      or (t.type = 'transfer' and t.to_account_id = p_account_id)
    )
    and (
      p_date is null
      or t.transaction_date < p_date
      or (t.transaction_date = p_date and t.created_at < p_created_at)
    );
$$;

comment on function public.account_net_before is
  'Net of an account''s settled movements before (date, created_at), or all of them.';

grant execute on function public.account_net_before to authenticated;
