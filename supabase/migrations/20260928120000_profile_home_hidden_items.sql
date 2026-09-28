-- Companion to `home_layout`: which of the Home screen's optional cards the
-- user has switched off entirely (not just reordered). Empty/null = show all.

alter table public.profiles
  add column home_hidden_items text[] not null default '{}';

comment on column public.profiles.home_hidden_items is
  'Keys (from HOME_LAYOUT_ITEMS in @repo/core) the user has hidden from Home entirely.';
