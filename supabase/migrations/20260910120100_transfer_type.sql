-- Transfer movement type: money moved between two of the user's own accounts.
-- Not income, not expense — net worth is unchanged. `to_account_id` is the
-- destination; `category_id` stays null for transfers.

alter table public.transactions drop constraint transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check (type in ('income', 'expense', 'transfer'));

alter table public.transactions
  add column to_account_id uuid references public.accounts (id) on delete restrict;

alter table public.transactions add constraint transactions_transfer_shape check (
  (
    type = 'transfer'
    and to_account_id is not null
    and to_account_id <> account_id
    and category_id is null
  )
  or (type <> 'transfer' and to_account_id is null)
);

create index transactions_to_account_id_idx on public.transactions (to_account_id);

-- Extend the integrity trigger: the destination account must belong to the same user.
create or replace function public.check_transaction_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.accounts a
    where a.id = new.account_id and a.user_id = new.user_id
  ) then
    raise exception 'account % does not belong to user %', new.account_id, new.user_id
      using errcode = 'check_violation';
  end if;

  if new.to_account_id is not null and not exists (
    select 1 from public.accounts a
    where a.id = new.to_account_id and a.user_id = new.user_id
  ) then
    raise exception 'destination account % does not belong to user %',
      new.to_account_id, new.user_id
      using errcode = 'check_violation';
  end if;

  if new.category_id is not null and not exists (
    select 1 from public.categories c
    where c.id = new.category_id
      and c.type = new.type
      and (c.is_default or c.user_id = new.user_id)
  ) then
    raise exception 'category % is not usable by user % for a % transaction',
      new.category_id, new.user_id, new.type
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
