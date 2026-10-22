-- Home's widget matrix: where each widget sits and how big it is, one layout
-- per device — `{ "desktop": [{ id, x, y, w, h }], "mobile": [...] }`
-- (columns: 4 on desktop, 2 on phones). Null = derive it from `home_layout`'s
-- order at default sizes. `home_hidden_items` still says which widgets are off.

alter table public.profiles
  add column home_grid jsonb;

comment on column public.profiles.home_grid is
  'Per-device Home widget grid ({desktop, mobile}: [{id, x, y, w, h}]) — see home-grid.ts in @repo/core.';
