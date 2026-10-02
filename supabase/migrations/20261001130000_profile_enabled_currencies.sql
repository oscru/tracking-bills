-- The user's chosen currency "pack" — like picking languages in a
-- translator app, this is the subset of ISO 4217 the account-currency
-- picker actually offers, instead of showing all ~150 every time.
-- `currency` stays as-is: now just the one preselected by default when
-- creating a new account, not a forced display/conversion currency —
-- the app no longer blends amounts across currencies (see accounts/budgets/
-- goals each locking their own `currency` instead of sharing one).

alter table public.profiles
  add column enabled_currencies text[] not null default array['MXN'];

update public.profiles set enabled_currencies = array[currency];

alter table public.profiles
  add constraint profiles_enabled_currencies_nonempty
    check (array_length(enabled_currencies, 1) > 0);

comment on column public.profiles.enabled_currencies is 'The currencies offered when picking an account''s currency — a user-curated subset of ISO 4217, not every currency that exists.';
comment on column public.profiles.currency is 'ISO 4217 code. Preselected by default when creating a new account — no longer a forced app-wide display currency.';
