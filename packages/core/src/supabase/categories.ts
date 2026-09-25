import type { Category } from '../types';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryCreateInput,
  type CategoryUpdateInput,
} from '../validators';
import { supabase } from './client';
import { unwrap } from './internal';

/** All of the user's categories (RLS scopes to the owner). Ordered for direct use in a sectioned list. */
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

/** Create a category. `user_id` defaults to the caller. */
export async function createCategory(input: CategoryCreateInput): Promise<Category> {
  const payload = categoryCreateSchema.parse(input);
  return unwrap(await supabase.from('categories').insert(payload).select().single()) as Category;
}

/** Update a category. */
export async function updateCategory(id: string, patch: CategoryUpdateInput): Promise<Category> {
  const payload = categoryUpdateSchema.parse(patch);
  return unwrap(
    await supabase.from('categories').update(payload).eq('id', id).select().single(),
  ) as Category;
}
