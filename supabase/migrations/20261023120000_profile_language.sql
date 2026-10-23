-- The app's interface language. Null means "follow the device or browser"
-- (Spanish or English; anything else falls back to English).
alter table public.profiles
  add column language text check (language in ('es', 'en'));

comment on column public.profiles.language is
  'Interface language chosen in Preferencias: es | en. Null follows the device/browser language.';
