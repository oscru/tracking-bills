-- A savings account can back at most one goal. Without this, two goals could
-- link to the same account and both would silently read its balance as their
-- own "progress" — one real deposit would inflate both goals at once, with
-- no error or warning anywhere.

create unique index goals_account_id_unique_idx
  on public.goals (account_id)
  where account_id is not null;
