-- Give every user a starter "Cash" account so they can record a transaction
-- immediately (full account management comes in Phase 6).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.accounts (user_id, name, type)
  values (new.id, 'Cash', 'cash');

  return new;
end;
$$;

-- Backfill existing users that have no account yet.
insert into public.accounts (user_id, name, type)
select p.id, 'Cash', 'cash'
from public.profiles p
where not exists (
  select 1 from public.accounts a where a.user_id = p.id
);
