import type { Tag } from '../types';
import { tagCreateSchema, tagUpdateSchema, type TagCreateInput, type TagUpdateInput } from '../validators';
import { supabase } from './client';
import { SupabaseError, unwrap } from './internal';

/** Active tags first, then by creation order — mirrors `listAccounts`. */
export async function listTags(): Promise<Tag[]> {
  return unwrap(
    await supabase
      .from('tags')
      .select('*')
      .order('archived', { ascending: true })
      .order('created_at', { ascending: true }),
  ) as Tag[];
}

export async function createTag(input: TagCreateInput): Promise<Tag> {
  const payload = tagCreateSchema.parse(input);
  return unwrap(await supabase.from('tags').insert(payload).select().single()) as Tag;
}

export async function updateTag(id: string, patch: TagUpdateInput): Promise<Tag> {
  const payload = tagUpdateSchema.parse(patch);
  return unwrap(await supabase.from('tags').update(payload).eq('id', id).select().single()) as Tag;
}

export function archiveTag(id: string, archived = true): Promise<Tag> {
  return updateTag(id, { archived });
}

/** Hard delete. Also drops any `transaction_tags` links (FK cascade). */
export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw new SupabaseError(error);
}

/** Replace the full set of tags on one transaction (diffs client-side, writes only the delta). */
export async function setTransactionTags(transactionId: string, tagIds: string[]): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('transaction_tags')
    .select('tag_id')
    .eq('transaction_id', transactionId);
  if (readError) throw new SupabaseError(readError);

  const current = new Set((existing ?? []).map((r) => r.tag_id));
  const next = new Set(tagIds);
  const toAdd = tagIds.filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !next.has(id));

  if (toAdd.length) {
    const { error } = await supabase
      .from('transaction_tags')
      .insert(toAdd.map((tag_id) => ({ transaction_id: transactionId, tag_id })));
    if (error) throw new SupabaseError(error);
  }
  if (toRemove.length) {
    const { error } = await supabase
      .from('transaction_tags')
      .delete()
      .eq('transaction_id', transactionId)
      .in('tag_id', toRemove);
    if (error) throw new SupabaseError(error);
  }
}
