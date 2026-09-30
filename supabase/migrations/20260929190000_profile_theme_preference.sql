-- Overrides the OS light/dark setting when not "system" — the app already
-- reads `profiles.currency` as its base display currency; this is the same
-- idea for appearance.

alter table public.profiles
  add column theme_preference text not null default 'system'
    check (theme_preference in ('system', 'light', 'dark'));

comment on column public.profiles.theme_preference is 'Overrides the OS light/dark setting when not "system".';
