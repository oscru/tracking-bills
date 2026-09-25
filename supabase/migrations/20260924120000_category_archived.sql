-- Categories gain the same "archived" retirement flag tags and accounts
-- already have: a user can retire a category they no longer use without
-- losing it off transactions that already reference it.

alter table public.categories
  add column archived boolean not null default false;

comment on column public.categories.archived is 'Retired via `archived`, not deleted, so history on already-categorized transactions stays intact.';
