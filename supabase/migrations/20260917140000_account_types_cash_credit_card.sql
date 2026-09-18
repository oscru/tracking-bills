-- Add back "Efectivo" (cash) and "Tarjeta de crédito" (credit_card) as their
-- own account types alongside investment/credit/debit/savings/loan.

alter table public.accounts drop constraint accounts_type_check;
alter table public.accounts
  add constraint accounts_type_check
  check (type in ('investment', 'credit', 'debit', 'savings', 'loan', 'cash', 'credit_card'));
