-- Per-account toggle for the home screen's account list.

alter table public.accounts
  add column show_on_home boolean not null default true;

comment on column public.accounts.show_on_home is
  'Whether this account appears in the "Tus cuentas" list on the home screen. Does not affect balance totals.';
