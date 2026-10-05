-- A one-time full-screen welcome carousel right after signup, replayable
-- from Settings ("Ver tour de nuevo").

alter table public.profiles
  add column has_seen_tour boolean not null default false;

-- Backfill: `default false` above would otherwise also apply to every
-- existing row, re-triggering the welcome carousel for current users who
-- never asked for it. Only rows created after this migration (fresh
-- signups, via `handle_new_user`, which doesn't set this column) should
-- fall through to the `false` default.
update public.profiles set has_seen_tour = true;

comment on column public.profiles.has_seen_tour is
  'Auto-shows the full-screen welcome carousel once when false. Settings''s "Ver tour de nuevo" resets this to false to replay it.';
