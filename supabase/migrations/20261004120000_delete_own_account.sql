-- Self-service account deletion. The client (a mobile app) can never hold
-- the service-role key needed to call the Admin API's deleteUser, and this
-- project has no Edge Functions deployed to proxy that server-side — so
-- instead, a `security definer` RPC does the delete itself, scoped to the
-- caller only (`auth.uid()`, never a parameter — there's no way to pass in
-- someone else's id and delete them).
--
-- Deleting the `auth.users` row is enough to remove everything: `profiles.id`
-- already references `auth.users (id) on delete cascade`, and every other
-- table in this schema (accounts, transactions, categories, budgets, goals,
-- tags, favorites...) already cascades from `profiles` the same way. No
-- other table needs touching here.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
