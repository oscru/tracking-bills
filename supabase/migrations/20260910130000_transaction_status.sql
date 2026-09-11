-- Movements can be logged as planned/pending, not just settled.

alter table public.transactions
  add column is_completed boolean not null default true;

comment on column public.transactions.is_completed is
  'Whether the movement has actually settled. false = planned/pending (e.g. a scheduled payment).';
