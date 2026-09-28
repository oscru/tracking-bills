import type { Profile, UpdateRow } from '../types';
import { profileUpdateSchema, type ProfileUpdateInput } from '../validators';
import { supabase } from './client';
import { unwrap } from './internal';

/** The caller's own profile row — RLS scopes `select` to it, so there's exactly one. */
export async function getProfile(): Promise<Profile> {
  return unwrap(await supabase.from('profiles').select('*').single()) as Profile;
}

/** Updates the caller's own profile. No `id` filter needed — RLS already scopes it. */
export async function updateProfile(patch: ProfileUpdateInput): Promise<Profile> {
  const payload = profileUpdateSchema.parse(patch) as UpdateRow<'profiles'>;
  return unwrap(
    await supabase.from('profiles').update(payload).select().single(),
  ) as Profile;
}
