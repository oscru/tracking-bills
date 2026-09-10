-- Shared helpers used across the schema.

-- Keeps an `updated_at` column in sync on every row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Trigger function: sets NEW.updated_at to now() on UPDATE.';
