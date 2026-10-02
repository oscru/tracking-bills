-- Categories could only be archived, never deleted — this adds a real
-- delete, gated tightly because every FK pointing at `categories` resolves
-- destructively on delete (not `restrict`, unlike accounts/goals):
--   - transactions.category_id    on delete set null  (silently decategorizes history)
--   - favorite_transactions.cat.. on delete set null  (silently breaks a saved favorite)
--   - budget_categories.category_id on delete cascade (silently shrinks a budget,
--     can even leave it with zero categories — see `budgetProgress`)
--   - categories.parent_id        on delete cascade  (deleting a parent takes its
--     subcategories with it — each one re-checked by this same trigger, since
--     cascade-deleted rows fire triggers too, so an active or in-use child blocks
--     the whole delete)
--
-- So a category is only deletable when: archived, not a built-in slugged
-- system category (e.g. the balance-adjustment categories `adjust-balance-
-- sheet.tsx` looks up by slug — deleting one would silently break that
-- feature), has no transactions, isn't used by a favorite, and isn't
-- assigned to a budget. Anything less and it's a no — no cascading
-- "cleanup" here, each of those is either real user history or another
-- feature's wiring.

create or replace function public.check_category_deletable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

create trigger categories_check_deletable
  before delete on public.categories
  for each row execute function public.check_category_deletable();
