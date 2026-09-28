-- Tracks how many times each favorite has actually been tapped to prefill a
-- movement, so the home row's slider can feature the ones the user relies on
-- most instead of just the most recently created ones.

alter table public.favorite_transactions
  add column use_count integer not null default 0 check (use_count >= 0);

comment on column public.favorite_transactions.use_count is
  'Incremented each time this favorite is tapped to prefill a new movement.';

-- Atomic increment (avoids a read-then-write race from the client). Runs
-- with the caller's own privileges, so the existing "owner only" RLS update
-- policy on favorite_transactions applies as normal — passing someone else's
-- id just matches zero rows.
create or replace function public.increment_favorite_transaction_use(favorite_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.favorite_transactions
  set use_count = use_count + 1
  where id = favorite_id;
$$;
