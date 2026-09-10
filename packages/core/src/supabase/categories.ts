import type { Category } from '../types';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryCreateInput,
  type CategoryUpdateInput,
} from '../validators';
import { supabase } from './client';
import { SupabaseError, unwrap } from './internal';

/**
 * All categories visible to the user: system defaults + their own custom ones
 * (RLS handles the union). Ordered for direct use in a sectioned list.
 */
export async function listCategories(): Promise<Category[]> {
  return unwrap(
    await supabase
      .from('categories')
      .select('*')
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
  ) as Category[];
}

/** Create a custom category. `user_id` defaults to the caller; `is_default` stays false. */
export async function createCategory(input: CategoryCreateInput): Promise<Category> {
  const payload = categoryCreateSchema.parse(input);
  return unwrap(await supabase.from('categories').insert(payload).select().single()) as Category;
}

/** Update a custom category. RLS rejects edits to system defaults. */
export async function updateCategory(id: string, patch: CategoryUpdateInput): Promise<Category> {
  const payload = categoryUpdateSchema.parse(patch);
  return unwrap(
    await supabase.from('categories').update(payload).eq('id', id).select().single(),
  ) as Category;
}

/** Delete a custom category. Referencing transactions keep `category_id = null`. */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new SupabaseError(error);
}
