-- The app's UI already keeps a transfer's source/destination accounts (and a
-- goal contribution's source account) in the same currency — there's no
-- exchange rate anywhere in this app to convert through. But that was only
-- enforced client-side (the account/goal picker just didn't offer mismatched
-- choices), so a direct insert — a CSV import, a future bug, a raw API call —
-- could still create a transfer that silently fabricates or destroys value
-- across currencies. Extend the existing integrity trigger to reject it here
-- too, same pattern as every other cross-row invariant in this schema.

create or replace function public.check_transaction_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from_currency text;
  v_to_currency text;
begin
  select currency into v_from_currency
    from public.accounts
    where id = new.account_id and user_id = new.user_id;

  if v_from_currency is null then
    raise exception 'account % does not belong to user %', new.account_id, new.user_id
      using errcode = 'check_violation';
  end if;

  if new.to_account_id is not null then
    select currency into v_to_currency
      from public.accounts
      where id = new.to_account_id and user_id = new.user_id;

    if v_to_currency is null then
      raise exception 'destination account % does not belong to user %',
        new.to_account_id, new.user_id
        using errcode = 'check_violation';
    end if;

    if v_to_currency <> v_from_currency then
      raise exception 'cannot transfer between accounts in different currencies (% vs %)',
        v_from_currency, v_to_currency
        using errcode = 'check_violation';
    end if;
  end if;

  if new.goal_id is not null and not exists (
    select 1 from public.goals g
    where g.id = new.goal_id and g.user_id = new.user_id and g.currency = v_from_currency
  ) then
    raise exception 'goal % does not belong to user %, or its currency does not match account %''s',
      new.goal_id, new.user_id, new.account_id
      using errcode = 'check_violation';
  end if;

  if new.category_id is not null and not exists (
    select 1 from public.categories c
    where c.id = new.category_id
      and c.type = new.type
      and c.user_id = new.user_id
  ) then
    raise exception 'category % is not usable by user % for a % transaction',
      new.category_id, new.user_id, new.type
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
