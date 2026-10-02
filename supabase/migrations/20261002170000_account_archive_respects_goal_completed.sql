-- `unlink_goal_on_account_archive` (20261002150000) always unlinked a goal
-- when its account got archived, regardless of completion. That stopped
-- being consistent once `goals.is_completed` was introduced (20261002160000)
-- with the opposite rule for the other direction: archiving a *completed*
-- goal keeps its account linked, since the account is now just a record of
-- where that finished goal's money lives. Archiving the account directly
-- (instead of archiving the goal) must honor the same rule — a completed
-- goal's link shouldn't survive one path and not the other.

create or replace function public.unlink_goal_on_account_archive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.goals
  set account_id = null
  where account_id = new.id
    and not is_completed;

  return new;
end;
$$;
