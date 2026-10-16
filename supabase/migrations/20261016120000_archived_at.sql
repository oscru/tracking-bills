-- When a record was archived — shown in its "información" sheet (accounts,
-- categories, tags). Kept by a trigger, so every way of archiving (the app,
-- an import, a cascade) records it: set when `archived` turns true, cleared
-- when it turns false.

alter table public.accounts add column archived_at timestamptz;
alter table public.categories add column archived_at timestamptz;
alter table public.tags add column archived_at timestamptz;

-- Records archived before this column existed: their last change is the
-- best estimate there is.
update public.accounts set archived_at = updated_at where archived;
update public.categories set archived_at = updated_at where archived;
update public.tags set archived_at = updated_at where archived;

create or replace function public.set_archived_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.archived and (tg_op = 'INSERT' or not old.archived) then
    new.archived_at := now();
  elsif not new.archived then
    new.archived_at := null;
  end if;
  return new;
end;
$$;

create trigger accounts_set_archived_at
  before insert or update of archived on public.accounts
  for each row execute function public.set_archived_at();

create trigger categories_set_archived_at
  before insert or update of archived on public.categories
  for each row execute function public.set_archived_at();

create trigger tags_set_archived_at
  before insert or update of archived on public.tags
  for each row execute function public.set_archived_at();
