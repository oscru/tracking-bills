-- Two gaps in the parent/subcategory model (categories_check_parent only
-- ever validated the CHILD side, never the parent):
--
-- 1. Changing a parent's `type` (Gasto<->Ingreso) was never checked against
--    its subcategories. `check_category_parent` returns early for a
--    top-level category (`new.parent_id is null`) without looking at its
--    children at all, so a parent could flip type while its subcategories
--    kept the old one. Every screen that builds the category tree filters
--    by `type` first (see `useCategoryTree`), so the mismatched children
--    just vanished — invisible, unarchivable, unselectable — while still
--    referenced by old transactions. There's no sensible auto-migration
--    (a subcategory like "Restaurantes" doesn't mean anything as income
--    just because its parent "Comida" became one), so block the change
--    instead.
--
-- 2. Archiving a parent hid its still-active subcategories from every
--    picker (`category-picker.tsx` nests children under the parent, and a
--    `p.archived && p.id !== selectedId` filter drops the whole branch), with
--    no way to "retire only the parent." Unlike (1), there IS an obvious,
--    safe default here — archiving a parent category means the whole branch
--    is retired — so this one cascades instead of blocking.

create or replace function public.check_category_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare p record;
begin
  if new.parent_id is null then
    if tg_op = 'UPDATE' and old.type <> new.type and exists (
      select 1 from public.categories c where c.parent_id = new.id
    ) then
      raise exception 'cannot change type of a category that has subcategories'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  select user_id, type, parent_id
    into p
  from public.categories
  where id = new.parent_id;

  if not found then
    raise exception 'parent category % not found', new.parent_id
      using errcode = 'foreign_key_violation';
  end if;
  if p.parent_id is not null then
    raise exception 'categories support only one level of nesting'
      using errcode = 'check_violation';
  end if;
  if p.type <> new.type then
    raise exception 'a subcategory must have the same type as its parent'
      using errcode = 'check_violation';
  end if;
  if p.user_id <> new.user_id then
    raise exception 'parent category is not usable by this user'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.categories c where c.parent_id = new.id) then
    raise exception 'a category with subcategories cannot become a subcategory'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create or replace function public.cascade_archive_subcategories()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.categories
  set archived = true
  where parent_id = new.id
    and not archived;

  return new;
end;
$$;

create trigger categories_cascade_archive_subcategories
  after update of archived on public.categories
  for each row
  when (new.archived and not old.archived)
  execute function public.cascade_archive_subcategories();
