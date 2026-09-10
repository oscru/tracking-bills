import type { Account, Category, Transaction, TransactionType } from '../types';
import {
  transactionCreateSchema,
  transactionUpdateSchema,
  type TransactionCreateInput,
  type TransactionUpdateInput,
} from '../validators';
import { supabase } from './client';
import { SupabaseError, unwrap } from './internal';

export interface TransactionFilters {
  /** Inclusive lower bound, YYYY-MM-DD. */
  from?: string;
  /** Inclusive upper bound, YYYY-MM-DD. */
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  /** Case-insensitive match against `description`. */
  search?: string;
  limit?: number;
  offset?: number;
}

/** A transaction row with its account and category embedded. */
export interface TransactionWithRefs extends Transaction {
  account: Pick<Account, 'id' | 'name' | 'type' | 'currency'> | null;
  category: Pick<
    Category,
    'id' | 'slug' | 'name' | 'icon' | 'color' | 'type' | 'is_default'
  > | null;
}

const WITH_REFS =
  '*, account:accounts(id, name, type, currency), category:categories(id, slug, name, icon, color, type, is_default)';

export async function listTransactions(
  filters: TransactionFilters = {},
): Promise<TransactionWithRefs[]> {
  let query = supabase
    .from('transactions')
    .select(WITH_REFS)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.from) query = query.gte('transaction_date', filters.from);
  if (filters.to) query = query.lte('transaction_date', filters.to);
  if (filters.accountId) query = query.eq('account_id', filters.accountId);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.search) query = query.ilike('description', `%${filters.search}%`);
  if (filters.limit != null) {
    const offset = filters.offset ?? 0;
    query = query.range(offset, offset + filters.limit - 1);
  }

  return unwrap(await query) as unknown as TransactionWithRefs[];
}

export async function getTransaction(id: string): Promise<TransactionWithRefs> {
  const data = unwrap(await supabase.from('transactions').select(WITH_REFS).eq('id', id).single());
  return data as unknown as TransactionWithRefs;
}

export async function createTransaction(input: TransactionCreateInput): Promise<Transaction> {
  const payload = transactionCreateSchema.parse(input);
  return unwrap(
    await supabase.from('transactions').insert(payload).select().single(),
  ) as Transaction;
}

export async function updateTransaction(
  id: string,
  patch: TransactionUpdateInput,
): Promise<Transaction> {
  const payload = transactionUpdateSchema.parse(patch);
  return unwrap(
    await supabase.from('transactions').update(payload).eq('id', id).select().single(),
  ) as Transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new SupabaseError(error);
}
