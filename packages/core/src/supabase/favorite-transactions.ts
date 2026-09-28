import type { Account, Category, FavoriteTransaction, InsertRow, UpdateRow } from '../types';
import {
  favoriteTransactionCreateSchema,
  favoriteTransactionUpdateSchema,
  type FavoriteTransactionCreateInput,
  type FavoriteTransactionUpdateInput,
} from '../validators';
import { supabase } from './client';
import { SupabaseError, unwrap } from './internal';

type AccountRef = Pick<Account, 'id' | 'name' | 'type' | 'currency'>;

/** A favorite with its account(s) and category embedded — everything one tap needs to prefill the form. */
export interface FavoriteTransactionWithRefs extends FavoriteTransaction {
  account: AccountRef | null;
  /** Destination account — only present on transfer favorites. */
  to_account: AccountRef | null;
  category: Pick<Category, 'id' | 'slug' | 'name' | 'icon' | 'color' | 'type'> | null;
}

// Two FKs point at `accounts`, so disambiguate the embeds by column name —
// same pattern as `transactions.ts`'s `WITH_REFS`.
const WITH_REFS =
  '*, account:accounts!account_id(id, name, type, currency), to_account:accounts!to_account_id(id, name, type, currency), category:categories(id, slug, name, icon, color, type)';

/** Creation order — the order the user added them in, oldest first. */
export async function listFavoriteTransactions(): Promise<FavoriteTransactionWithRefs[]> {
  return unwrap(
    await supabase
      .from('favorite_transactions')
      .select(WITH_REFS)
      .order('created_at', { ascending: true }),
  ) as unknown as FavoriteTransactionWithRefs[];
}

export async function createFavoriteTransaction(
  input: FavoriteTransactionCreateInput,
): Promise<FavoriteTransaction> {
  const payload = favoriteTransactionCreateSchema.parse(input) as InsertRow<'favorite_transactions'>;
  return unwrap(
    await supabase.from('favorite_transactions').insert(payload).select().single(),
  ) as FavoriteTransaction;
}

export async function updateFavoriteTransaction(
  id: string,
  patch: FavoriteTransactionUpdateInput,
): Promise<FavoriteTransaction> {
  const payload = favoriteTransactionUpdateSchema.parse(patch) as UpdateRow<'favorite_transactions'>;
  return unwrap(
    await supabase.from('favorite_transactions').update(payload).eq('id', id).select().single(),
  ) as FavoriteTransaction;
}

/** Hard delete — a favorite is a shortcut, not historical data; nothing else references it. */
export async function deleteFavoriteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('favorite_transactions').delete().eq('id', id);
  if (error) throw new SupabaseError(error);
}

/** Bumps a favorite's `use_count` by one — call each time it's tapped to prefill a movement. */
export async function recordFavoriteTransactionUse(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_favorite_transaction_use', { favorite_id: id });
  if (error) throw new SupabaseError(error);
}
