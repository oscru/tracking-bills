-- Default user_id to the caller's uid so PostgREST inserts don't have to send it.
-- RLS still enforces `auth.uid() = user_id` via each table's WITH CHECK policy.

alter table public.accounts     alter column user_id set default auth.uid();
alter table public.categories   alter column user_id set default auth.uid();
alter table public.transactions alter column user_id set default auth.uid();
