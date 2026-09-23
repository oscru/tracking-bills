import type {
  Account,
  Category,
  InsertRow,
  Transaction,
  TransactionType,
  UpdateRow,
} from '../types';
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
  /** Match any of these accounts (OR). Omit/empty = no filter. */
  accountIds?: string[];
  /** Match any of these categories (OR). Omit/empty = no filter. */
  categoryIds?: string[];
  type?: TransactionType;
  /** Case-insensitive match against `description`. */
  search?: string;
  limit?: number;
  offset?: number;
}

type AccountRef = Pick<Account, 'id' | 'name' | 'type' | 'currency'>;

/** A transaction row with its account(s) and category embedded. */
export interface TransactionWithRefs extends Transaction {
  account: AccountRef | null;
  /** Destination account — only present on transfers. */
  to_account: AccountRef | null;
  category: Pick<Category, 'id' | 'slug' | 'name' | 'icon' | 'color' | 'type'> | null;
}

// Two FKs point at `accounts`, so disambiguate the embeds by column name.
const WITH_REFS =
  '*, account:accounts!account_id(id, name, type, currency), to_account:accounts!to_account_id(id, name, type, currency), category:categories(id, slug, name, icon, color, type)';

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
  if (filters.accountIds?.length) query = query.in('account_id', filters.accountIds);
  if (filters.categoryIds?.length) query = query.in('category_id', filters.categoryIds);
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
  const payload = transactionCreateSchema.parse(input) as InsertRow<'transactions'>;
  return unwrap(
    await supabase.from('transactions').insert(payload).select().single(),
  ) as Transaction;
}

export async function updateTransaction(
  id: string,
  patch: TransactionUpdateInput,
): Promise<Transaction> {
  const payload = transactionUpdateSchema.parse(patch) as UpdateRow<'transactions'>;
  return unwrap(
    await supabase.from('transactions').update(payload).eq('id', id).select().single(),
  ) as Transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new SupabaseError(error);
}
