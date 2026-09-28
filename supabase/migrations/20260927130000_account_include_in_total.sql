-- Per-account toggle for the home screen's overall balance. Separate from
-- `show_on_home` (which only controls the account's row in the "Tus cuentas"
-- list) — this one decides whether its balance is added into "Balance total".
-- Handy for accounts that shouldn't count toward net worth, e.g. a card used
-- to track someone else's money or a sinking fund tracked outside the total.

alter table public.accounts
  add column include_in_total boolean not null default true;

comment on column public.accounts.include_in_total is
  'Whether this account''s balance is added into the home screen''s overall "Balance total". Does not affect the account''s own displayed balance.';
