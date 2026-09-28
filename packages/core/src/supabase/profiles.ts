import type { Profile, UpdateRow } from '../types';
import { profileUpdateSchema, type ProfileUpdateInput } from '../validators';
import { supabase } from './client';
import { unwrap } from './internal';

/** RLS already scopes every profiles query to the caller, but Postgres still
 * rejects an `UPDATE`/`DELETE` with no `WHERE` clause outright — so every
 * query here still needs an explicit `id` filter, not just RLS. */
async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('No authenticated user');
  return data.user.id;
}

/** The caller's own profile row. */
export async function getProfile(): Promise<Profile> {
  const userId = await currentUserId();
  return unwrap(
    await supabase.from('profiles').select('*').eq('id', userId).single(),
  ) as Profile;
}

/** Updates the caller's own profile. */
export async function updateProfile(patch: ProfileUpdateInput): Promise<Profile> {
  const payload = profileUpdateSchema.parse(patch) as UpdateRow<'profiles'>;
  const userId = await currentUserId();
  return unwrap(
    await supabase.from('profiles').update(payload).eq('id', userId).select().single(),
  ) as Profile;
}
