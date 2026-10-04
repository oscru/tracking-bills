-- `delete_own_account` cascades from `auth.users` through `profiles` into
-- every owned table, including `categories` — which `check_category_deletable`
-- (migration 20261002200000) guards against deleting while it still has
-- transactions, exactly the state every category is in mid-cascade here
-- (the `transactions`/`categories` cascades both hang off `profiles`
-- independently, so Postgres gives no guarantee transactions are gone
-- first). That guard is correct for the app's own "Eliminar categoría"
-- button — a single category being removed on its own really shouldn't
-- silently decategorize history — but wrong here, where the transactions
-- are being wiped in the very same operation. A session-local flag lets
-- `delete_own_account` bypass it specifically, without loosening the guard
-- for anything else.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.deleting_own_account', 'true', true);
  delete from auth.users where id = (select auth.uid());
end;
$$;

create or replace function public.check_category_deletable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.deleting_own_account', true), '') = 'true' then
    return old;
  end if;

  if old.slug is not null then
    raise exception 'cannot delete a system category'
      using errcode = 'check_violation';
  end if;

  if not old.archived then
    raise exception 'cannot delete a category that is not archived'
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.transactions t where t.category_id = old.id) then
    raise exception 'cannot delete a category that has transactions'
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.favorite_transactions f where f.category_id = old.id) then
    raise exception 'cannot delete a category used by a favorite movement'
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.budget_categories bc where bc.category_id = old.id) then
    raise exception 'cannot delete a category assigned to a budget'
      using errcode = 'check_violation';
  end if;

  return old;
end;
$$;
