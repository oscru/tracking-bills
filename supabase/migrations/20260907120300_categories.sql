-- categories: always user-owned. Every user gets a starter "guide" set seeded
-- at signup (see handle_new_user in 20260908130000_default_account.sql) —
-- those rows are ordinary categories from here on: editable and deletable
-- like anything the user creates themselves, same hierarchy, same rules.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  slug text check (slug is null or slug ~ '^[a-z0-9_]+$'),
  name text not null check (char_length(trim(name)) between 1 and 60),
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text check (color is null or color ~* '^#[0-9a-f]{6}$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.categories is 'Transaction categories, always owned by a single user.';
comment on column public.categories.slug is 'Stable app-internal reference some categories carry (e.g. the balance-adjustment flow looks one up by slug). Unique per user; not tied to permissions.';

-- A user can't have two categories sharing the same slug (NULLs don't collide).
create unique index categories_user_slug_key
  on public.categories (user_id, slug) where slug is not null;

create index categories_user_id_idx on public.categories (user_id);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- RLS: full CRUD, scoped to the owner — no distinction between "starter" and
-- user-created categories.
alter table public.categories enable row level security;

create policy "Categories are viewable by their owner"
  on public.categories for select
  using ((select auth.uid()) = user_id);

create policy "Categories are insertable by their owner"
  on public.categories for insert
  with check ((select auth.uid()) = user_id);

create policy "Categories are updatable by their owner"
  on public.categories for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Categories are deletable by their owner"
  on public.categories for delete
  using ((select auth.uid()) = user_id);
