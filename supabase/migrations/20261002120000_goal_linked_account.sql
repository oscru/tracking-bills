-- Optional dedicated savings account for a goal. Today a goal is purely a
-- "virtual envelope" — contributions are transfers tagged with `goal_id` and
-- no real destination account exists (see 20260929170000_goals.sql), which is
-- why exporting a goal contribution to CSV has to invent a text placeholder
-- ("Objetivo: <name>") that doesn't round-trip on re-import. Linking a goal
-- to a real account fixes that for anyone who wants it, without touching the
-- existing virtual model for anyone who doesn't:
--   - `account_id` is NULL (default) → goal behaves exactly as before.
--   - `account_id` is set → contributions become ordinary account-to-account
--     transfers (`to_account_id` = this account, `goal_id` left null, same
--     shape `transactions_transfer_shape` already allows), and progress is
--     just that account's real balance.

alter table public.goals
  add column account_id uuid references public.accounts (id) on delete set null;

comment on column public.goals.account_id is
  'Optional dedicated savings account backing this goal. When set, progress = that account''s balance and contributions are normal to_account_id transfers instead of goal_id ones. NULL keeps the original virtual-envelope behavior.';

-- A linked account must belong to the same user and share the goal's locked
-- currency — same no-conversion rule as everywhere else in this schema.
create or replace function public.check_goal_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_currency text;
  v_account_user uuid;
begin
  if new.account_id is null then
    return new;
  end if;

  select currency, user_id into v_account_currency, v_account_user
    from public.accounts
    where id = new.account_id;

  if v_account_user is null or v_account_user <> new.user_id then
    raise exception 'account % does not belong to user %', new.account_id, new.user_id
      using errcode = 'check_violation';
  end if;

  if v_account_currency <> new.currency then
    raise exception 'linked account %''s currency (%) does not match goal currency (%)',
      new.account_id, v_account_currency, new.currency
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger goals_check_account
  before insert or update of account_id, currency on public.goals
  for each row execute function public.check_goal_account();
