-- `currency` and `initial_balance` are documented as "locked after creation"
-- (see `accountUpdateSchema`, which already omits both) — changing either
-- after the fact would silently reinterpret every transaction already
-- booked against the account instead of converting anything. But that was
-- only enforced by the app's own Zod schema, which a direct API call,
-- script, or future bug could bypass entirely (RLS allows updating any
-- column on an owned row). Enforce it at the DB too.

create or replace function public.check_account_locked_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.currency is distinct from old.currency then
    raise exception 'cannot change currency after account creation'
      using errcode = 'check_violation';
  end if;

  if new.initial_balance is distinct from old.initial_balance then
    raise exception 'cannot change initial_balance after account creation'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger accounts_check_locked_fields
  before update of currency, initial_balance on public.accounts
  for each row execute function public.check_account_locked_fields();
