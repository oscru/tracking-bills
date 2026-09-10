-- categories: system defaults (user_id IS NULL) + user-custom rows.
--
-- i18n / translatable labels
-- --------------------------
-- System default categories are NOT stored as localized strings. Each carries a
-- stable `slug` (e.g. 'groceries', 'salary') that the client maps to a
-- translation key: `categories.<slug>`. The `name` column holds an English
-- fallback so a label always renders even without a loaded translation bundle.
--
-- User-custom categories have `slug = NULL` and `is_default = false`; their
-- `name` is the literal text the user typed and is shown as-is (never translated).

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  slug text check (slug is null or slug ~ '^[a-z0-9_]+$'),
  name text not null check (char_length(trim(name)) between 1 and 60),
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text check (color is null or color ~* '^#[0-9a-f]{6}$'),
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Defaults are system-owned and slugged; custom rows are user-owned and not.
  constraint categories_default_shape check (
    (is_default and user_id is null and slug is not null)
    or (not is_default and user_id is not null and slug is null)
  )
);

comment on table public.categories is 'Transaction categories: system defaults (slugged, translatable) + user-custom.';
comment on column public.categories.slug is 'Stable i18n key for default categories; maps to translation key categories.<slug>. NULL for custom.';
comment on column public.categories.name is 'English fallback label for defaults; literal user text for custom categories.';

-- One row per default slug.
create unique index categories_default_slug_key
  on public.categories (slug) where user_id is null;

create index categories_user_id_idx on public.categories (user_id);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- RLS: everyone reads defaults; users read/write only their own custom rows.
alter table public.categories enable row level security;

create policy "Default and own categories are viewable"
  on public.categories for select
  using (is_default or (select auth.uid()) = user_id);

create policy "Custom categories are insertable by their owner"
  on public.categories for insert
  with check ((select auth.uid()) = user_id and not is_default);

create policy "Custom categories are updatable by their owner"
  on public.categories for update
  using ((select auth.uid()) = user_id and not is_default)
  with check ((select auth.uid()) = user_id and not is_default);

create policy "Custom categories are deletable by their owner"
  on public.categories for delete
  using ((select auth.uid()) = user_id and not is_default);
