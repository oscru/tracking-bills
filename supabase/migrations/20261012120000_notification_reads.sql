-- notification_reads: which in-app notifications a user has read or dismissed.
-- The notifications themselves aren't stored — they're derived on the client
-- from pending transactions, budgets and goals (`@repo/core/notifications`),
-- each with a stable text id (e.g. `budget-exceeded:<budget id>:<period start>`).
-- Only the per-user read/dismissed state lives here, so it follows the user
-- across devices.

create table public.notification_reads (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  notification_id text not null check (char_length(notification_id) between 1 and 200),
  read_at timestamptz not null default now(),
  dismissed_at timestamptz,
  primary key (user_id, notification_id)
);

comment on table public.notification_reads is 'Read/dismissed state for derived in-app notifications, keyed by their stable client-computed id.';

alter table public.notification_reads enable row level security;

create policy "Notification reads are viewable by their owner"
  on public.notification_reads for select
  using ((select auth.uid()) = user_id);

create policy "Notification reads are insertable by their owner"
  on public.notification_reads for insert
  with check ((select auth.uid()) = user_id);

create policy "Notification reads are updatable by their owner"
  on public.notification_reads for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Notification reads are deletable by their owner"
  on public.notification_reads for delete
  using ((select auth.uid()) = user_id);
