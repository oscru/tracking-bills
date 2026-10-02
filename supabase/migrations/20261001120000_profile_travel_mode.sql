-- Travel mode: while active, new transactions default to carrying the trip's
-- tag so a user doesn't have to tag every expense/income/transfer by hand
-- during a trip. `travel_trip_tag_id` points at a real `tags` row (reusing
-- the existing tag system) rather than storing the name as plain text, so
-- the trip's movements show up like any other tag everywhere tags already do.

alter table public.profiles
  add column travel_mode boolean not null default false,
  add column travel_trip_tag_id uuid references public.tags (id) on delete set null;

comment on column public.profiles.travel_mode is 'When true, new expenses/income/transfers default to travel_trip_tag_id.';
comment on column public.profiles.travel_trip_tag_id is 'Tag applied by default to new transactions while travel_mode is active. Nullable (not cascaded) so deleting the tag just clears this instead of touching the profile.';
