-- Replace the account type set (cash/bank/credit_card) with the five
-- categories the UI now offers: investment, credit, debit, savings, loan.
-- Existing accounts are remapped to their closest new type before the
-- constraint is swapped, since the old values would otherwise violate it.

update public.accounts set type = 'debit' where type in ('cash', 'bank');
update public.accounts set type = 'credit' where type = 'credit_card';

alter table public.accounts drop constraint accounts_type_check;
alter table public.accounts
  add constraint accounts_type_check
  check (type in ('investment', 'credit', 'debit', 'savings', 'loan'));

-- handle_new_user still created the starter account with type 'cash', which
-- the constraint above now rejects. Point it at 'debit' instead.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.accounts (user_id, name, type)
  values (new.id, 'Cash', 'debit');

  return new;
end;
$$;
