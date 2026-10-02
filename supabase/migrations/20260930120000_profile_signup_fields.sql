-- Standard sign-up fields collected by the email/password form. Nullable:
-- OAuth sign-ins (Google/Apple) don't provide a birth date or gender, and
-- there's no profile-completion flow yet to backfill them.

alter table public.profiles
  add column full_name text,
  add column birth_date date,
  add column gender text check (gender in ('female', 'male', 'other', 'prefer_not_to_say'));

comment on column public.profiles.full_name is 'Collected at sign-up. Null for OAuth sign-ins.';
comment on column public.profiles.birth_date is 'Collected at sign-up. Null for OAuth sign-ins.';
comment on column public.profiles.gender is 'Collected at sign-up. Null for OAuth sign-ins.';

-- Copy the new fields from auth.users.raw_user_meta_data (set via
-- `supabase.auth.signUp({ options: { data: {...} } })`) into the profile
-- row this trigger already creates.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, birth_date, gender)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    new.raw_user_meta_data ->> 'gender'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
