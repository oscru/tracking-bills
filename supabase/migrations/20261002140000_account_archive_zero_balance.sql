-- An archived account still keeps its real balance (archiving only hides it
-- from pickers — see `accountBalance` in packages/core, which never looks at
-- `archived`), so letting someone archive an account with money still in it
-- just buries that money where it's easy to forget about. Require the
-- balance to be exactly zero before archiving, same as the app already
-- requires before trusting a balance figure anywhere else.
--
-- The balance math here mirrors `transactionEffect`/`accountBalance` in
-- packages/core/src/utils/index.ts exactly: initial_balance, plus every
-- *settled* transaction's signed effect (income +, expense -, transfer -/+
-- depending on which side this account is on).

create or replace function public.check_account_archive_zero_balance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance numeric;
begin
  select old.initial_balance + coalesce(sum(
    case
      when t.type = 'income' and t.account_id = new.id then t.amount
      when t.type = 'expense' and t.account_id = new.id then -t.amount
      when t.type = 'transfer' then
        (case when t.account_id = new.id then -t.amount else 0 end)
        + (case when t.to_account_id = new.id then t.amount else 0 end)
      else 0
    end
  ), 0)
  into v_balance
  from public.transactions t
  where t.is_completed
    and (t.account_id = new.id or t.to_account_id = new.id);

  if v_balance <> 0 then
    raise exception 'cannot archive account % with a non-zero balance (%)', new.id, v_balance
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger accounts_check_archive_zero_balance
  before update of archived on public.accounts
  for each row
  when (new.archived and not old.archived)
  execute function public.check_account_archive_zero_balance();
