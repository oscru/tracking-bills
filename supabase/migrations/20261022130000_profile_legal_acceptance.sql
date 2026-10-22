-- Which version of the legal documents (Aviso de privacidad, Política de
-- cookies, Términos y condiciones — published together under one version,
-- `LEGAL_VERSION` in @repo/core) each person accepted, and when. Null = never
-- accepted (accounts created before these existed, or through Google/Apple,
-- which skip the sign-up form): the app asks once before going in.

alter table public.profiles
  add column legal_version text,
  add column legal_accepted_at timestamptz;

comment on column public.profiles.legal_version is
  'Version of the legal documents (LEGAL_VERSION in @repo/core) the user accepted.';
comment on column public.profiles.legal_accepted_at is
  'When the user accepted legal_version.';

-- Same as before (20260930120000), plus: the sign-up form sends the version
-- the person accepted in the auth metadata — stored with the time, so the
-- acceptance is recorded even when email confirmation delays the session.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted text := nullif(new.raw_user_meta_data ->> 'legal_version', '');
begin
  insert into public.profiles (id, email, full_name, birth_date, gender, legal_version, legal_accepted_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    new.raw_user_meta_data ->> 'gender',
    accepted,
    case when accepted is not null then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
