-- Archiving an account and unlinking any goal that points at it (so the
-- goal doesn't keep referencing a now-unselectable, archived account) must
-- happen atomically. Doing it as two separate client-side mutations — update
-- the account, then update the goal — leaves a window where the first
-- succeeds and the second doesn't (dropped connection, app backgrounded
-- mid-flight), producing exactly the inconsistent state this was meant to
-- prevent: an archived account still linked to a goal. A trigger in the same
-- statement's transaction can't partially apply — either both rows change or
-- neither does.

create or replace function public.unlink_goal_on_account_archive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.goals
  set account_id = null
  where account_id = new.id;

  return new;
end;
$$;

create trigger accounts_unlink_goal_on_archive
  after update of archived on public.accounts
  for each row
  when (new.archived and not old.archived)
  execute function public.unlink_goal_on_account_archive();
