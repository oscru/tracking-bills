-- Lets a user reorder the Home screen's optional cards. The balance card and
-- month selector are the anchor of the screen and are never included here —
-- only the cards listed in HOME_LAYOUT_ITEMS (packages/core) are reorderable.
-- Null = default order.

alter table public.profiles
  add column home_layout text[];

comment on column public.profiles.home_layout is
  'Custom order of the Home screen''s optional cards (see HOME_LAYOUT_ITEMS in @repo/core). Null = default order.';
