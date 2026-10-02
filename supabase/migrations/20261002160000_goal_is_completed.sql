-- Explicit "reached the target and the user confirmed it" state. Until now,
-- "complete" was purely a computed `progress.saved >= target_amount` (see
-- `goalProgress` in packages/core) — never stored, so there was no way to
-- actually *close* a goal: it just sat there accepting more contributions
-- forever once it crossed 100%, with no distinction between "still open,
-- happens to be over-funded today" and "done, I'm finished with this."
-- Marking it complete is a deliberate user action (the UI only offers it
-- once progress reaches the target) rather than an automatic flip.

alter table public.goals
  add column is_completed boolean not null default false;

comment on column public.goals.is_completed is
  'Explicitly set by the user once progress reaches target_amount — never automatic. Gates the unlink-on-archive rule below.';

-- Archiving a goal that was never marked complete means the user is
-- abandoning it, not closing it out successfully — free up its dedicated
-- savings account (if any) so it can be linked to a different goal instead
-- of staying tied to one nobody is tracking anymore (same reasoning as
-- `accounts_unlink_goal_on_archive`, from the other direction). A goal
-- archived *after* being marked complete keeps its account linked, since the
-- account is now just a record of where that finished goal's money lives.
create or replace function public.unlink_account_on_incomplete_goal_archive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived and not old.archived and not new.is_completed then
    new.account_id := null;
  end if;
  return new;
end;
$$;

create trigger goals_unlink_account_on_archive
  before update of archived on public.goals
  for each row
  when (new.archived and not old.archived)
  execute function public.unlink_account_on_incomplete_goal_archive();
