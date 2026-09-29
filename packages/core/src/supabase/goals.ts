import type { Goal, InsertRow, UpdateRow } from '../types';
import { goalCreateSchema, goalUpdateSchema, type GoalCreateInput, type GoalUpdateInput } from '../validators';
import { supabase } from './client';
import { SupabaseError, unwrap } from './internal';

/** Creation order — the order the user set them up in, oldest first. */
export async function listGoals(): Promise<Goal[]> {
  return unwrap(
    await supabase.from('goals').select('*').order('created_at', { ascending: true }),
  ) as Goal[];
}

export async function createGoal(input: GoalCreateInput): Promise<Goal> {
  const payload = goalCreateSchema.parse(input) as InsertRow<'goals'>;
  return unwrap(await supabase.from('goals').insert(payload).select().single()) as Goal;
}

export async function updateGoal(id: string, patch: GoalUpdateInput): Promise<Goal> {
  const payload = goalUpdateSchema.parse(patch) as UpdateRow<'goals'>;
  return unwrap(
    await supabase.from('goals').update(payload).eq('id', id).select().single(),
  ) as Goal;
}

/** Hard delete — blocked by the DB (`goal_id` is `on delete restrict`) while any contribution still points at it. */
export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw new SupabaseError(error);
}
