-- Subcategories: one level of nesting on public.categories.
-- parent_id NULL  -> top-level category
-- parent_id set   -> subcategory of that parent (which must itself be top-level)

alter table public.categories
  add column parent_id uuid references public.categories (id) on delete cascade;

alter table public.categories
  add constraint categories_parent_not_self check (parent_id is null or parent_id <> id);

create index categories_parent_id_idx on public.categories (parent_id);

-- Enforce: max 2 levels, matching income/expense type, and the parent must be
-- owned by the same user. Also blocks turning a category that already has
-- subcategories into a subcategory itself.
create or replace function public.check_category_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare p record;
begin
  if new.parent_id is null then
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

create trigger categories_check_parent
  before insert or update on public.categories
  for each row execute function public.check_category_parent();
