-- `profiles.enabled_currencies` is the curated subset offered when picking a
-- currency for a NEW account/budget/goal — but nothing stopped a user from
-- removing a currency that an EXISTING account/budget/goal already locked in.
-- That doesn't delete or break anything (each row keeps its own `currency`
-- regardless), but it's confusing: the thing is still there, still in that
-- currency, just no longer explained by anything in Preferences. Block the
-- removal instead, same as every other "in use" guard in this schema.

create or replace function public.check_enabled_currencies_in_use()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed text[];
  still_in_use text;
begin
  removed := array(
    select unnest(old.enabled_currencies)
    except
    select unnest(new.enabled_currencies)
  );

  if removed = '{}' then
    return new;
  end if;

  select currency into still_in_use
  from (
    select currency from public.accounts where user_id = new.id and currency = any (removed)
    union
    select currency from public.budgets where user_id = new.id and currency = any (removed)
    union
    select currency from public.goals where user_id = new.id and currency = any (removed)
  ) in_use
  limit 1;

  if still_in_use is not null then
    raise exception 'cannot disable currency % still in use by an account, budget, or goal', still_in_use
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger profiles_check_enabled_currencies_in_use
  before update of enabled_currencies on public.profiles
  for each row
  when (new.enabled_currencies is distinct from old.enabled_currencies)
  execute function public.check_enabled_currencies_in_use();
