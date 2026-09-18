-- Let users pick a color to tell accounts apart at a glance, same as categories.

alter table public.accounts
  add column color text check (color is null or color ~* '^#[0-9a-f]{6}$');
