-- Notification preferences (which reminders/alerts to send, at what hour,
-- the budget warning threshold). A jsonb blob rather than one column per
-- toggle: the set of notification kinds will keep growing, and the app
-- validates and fills in defaults for any missing key
-- (`notificationPrefsSchema` in `@repo/core/notifications`). Stored on the
-- profile so the choices follow the user across devices.

alter table public.profiles
  add column notification_prefs jsonb not null default '{}'::jsonb
  check (jsonb_typeof(notification_prefs) = 'object');

comment on column public.profiles.notification_prefs is
  'Notification preferences; missing keys fall back to app defaults (see notificationPrefsSchema).';
