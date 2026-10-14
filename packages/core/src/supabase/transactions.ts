import type {
  Account,
  Category,
  Goal,
  InsertRow,
  Tag,
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
  /** Match any of these tags (OR). Omit/empty = no filter. */
  tagIds?: string[];
  type?: TransactionType;
  /** Case-insensitive match against `description`. */
  search?: string;
  /** `false` = only planned/pending movements; `true` = only settled ones. Omit = no filter. */
  isCompleted?: boolean;
  limit?: number;
  offset?: number;
}

type AccountRef = Pick<Account, 'id' | 'name' | 'type' | 'currency'>;
type GoalRef = Pick<Goal, 'id' | 'name' | 'icon'>;
export type TagRef = Pick<Tag, 'id' | 'name' | 'color'>;

/** A transaction row with its account(s), category, goal, and tags embedded. */
export interface TransactionWithRefs extends Transaction {
  account: AccountRef | null;
  /** Destination account — only present on account-to-account transfers. */
  to_account: AccountRef | null;
  /** Destination goal — only present on transfers aimed at a savings goal instead of an account. */
  goal: GoalRef | null;
  category: Pick<Category, 'id' | 'slug' | 'name' | 'icon' | 'color' | 'type' | 'parent_id'> | null;
  tags: TagRef[];
}

// Two FKs point at `accounts`, so disambiguate the embeds by column name.
// `tags` comes back nested as `[{ tag: {...} }]` (one row per join-table
// link) — flattened to a plain `TagRef[]` by `normalizeTags` below.
const WITH_REFS =
  '*, account:accounts!account_id(id, name, type, currency), to_account:accounts!to_account_id(id, name, type, currency), goal:goals(id, name, icon), category:categories(id, slug, name, icon, color, type, parent_id), tags:transaction_tags(tag:tags(id, name, color))';

interface RawWithRefs extends Omit<TransactionWithRefs, 'tags'> {
  tags: { tag: TagRef | null }[] | null;
}

function normalizeTags(row: RawWithRefs): TransactionWithRefs {
  return { ...row, tags: (row.tags ?? []).map((t) => t.tag).filter((t): t is TagRef => t != null) };
}

// PostgREST caps any single response at its configured `max_rows` (1000 in
// this project, both locally and on the hosted project) regardless of how
// many rows actually match — silently, with no error. A caller that doesn't
// pass `filters.limit` wants the *complete* result set (Análisis and Home's
// charts/streaks all aggregate across a user's whole history), so past a
// few hundred transactions they'd silently lose everything older than the
// most recent page. Page through in that same chunk size until a short
// page confirms there's nothing left, instead of trusting one request.
const MAX_PAGE_SIZE = 1000;

/** The filtered, newest-first base query (without paging). */
function filteredQuery(filters: TransactionFilters, tagFilteredIds: string[] | null) {
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
  if (filters.isCompleted != null) query = query.eq('is_completed', filters.isCompleted);
  if (tagFilteredIds) query = query.in('id', tagFilteredIds);
  return query;
}

/** Ids of the transactions carrying any of `filters.tagIds` — `null` when there's no tag filter. */
async function tagFilteredTransactionIds(filters: TransactionFilters): Promise<string[] | null> {
  if (!filters.tagIds?.length) return null;
  const { data: links, error } = await supabase
    .from('transaction_tags')
    .select('transaction_id')
    .in('tag_id', filters.tagIds);
  if (error) throw new SupabaseError(error);
  return [...new Set((links ?? []).map((l) => l.transaction_id))];
}

export async function listTransactions(
  filters: TransactionFilters = {},
): Promise<TransactionWithRefs[]> {
  const tagFilteredIds = await tagFilteredTransactionIds(filters);
  // No matches: short-circuit rather than send an empty `.in()` (which
  // Postgres/PostgREST would otherwise happily read as "no filter").
  if (tagFilteredIds?.length === 0) return [];

  if (filters.limit != null) {
    const offset = filters.offset ?? 0;
    const query = filteredQuery(filters, tagFilteredIds).range(offset, offset + filters.limit - 1);
    const rows = unwrap(await query) as unknown as RawWithRefs[];
    return rows.map(normalizeTags);
  }

  const all: RawWithRefs[] = [];
  let offset = 0;
  for (;;) {
    const query = filteredQuery(filters, tagFilteredIds).range(offset, offset + MAX_PAGE_SIZE - 1);
    const page = unwrap(await query) as unknown as RawWithRefs[];
    all.push(...page);
    if (page.length < MAX_PAGE_SIZE) break;
    offset += MAX_PAGE_SIZE;
  }
  return all.map(normalizeTags);
}

/**
 * Every movement (any status) a savings goal involves: anything tagged to a
 * goal (`goal_id`, the virtual model) and everything touching an account
 * linked to a goal (whose balance IS that goal's savings). Far fewer than
 * the whole history — what goal progress, a goal's contributions list and
 * goal notifications need (progress itself only counts settled ones).
 */
export async function listGoalTransactions(
  linkedAccountIds: readonly string[],
): Promise<TransactionWithRefs[]> {
  const ids = [...linkedAccountIds].join(',');
  const touches = ids ? `,account_id.in.(${ids}),to_account_id.in.(${ids})` : '';
  const all: RawWithRefs[] = [];
  for (let offset = 0; ; offset += MAX_PAGE_SIZE) {
    const page = unwrap(
      await filteredQuery({}, null)
        .or(`goal_id.not.is.null${touches}`)
        .range(offset, offset + MAX_PAGE_SIZE - 1),
    ) as unknown as RawWithRefs[];
    all.push(...page);
    if (page.length < MAX_PAGE_SIZE) break;
  }
  return all.map(normalizeTags);
}

export interface TransactionPage {
  rows: TransactionWithRefs[];
  /** Pass as `before` to get the next page; `null` once there's nothing older. */
  nextBefore: string | null;
}

/**
 * One page of the filtered list, newest first, for infinite scrolling —
 * about `size` rows, always made of WHOLE days: the page's oldest day is
 * completed with a second query, and the next page starts strictly before
 * it (`before`, exclusive). So a day never straddles two pages, and its
 * header total is right from the start. Keyset (by date), not offset, so
 * a movement added meanwhile can't shift or duplicate rows across pages.
 */
export async function listTransactionsPage(
  filters: TransactionFilters = {},
  { before, size = 150 }: { before?: string | null; size?: number } = {},
): Promise<TransactionPage> {
  const tagFilteredIds = await tagFilteredTransactionIds(filters);
  if (tagFilteredIds?.length === 0) return { rows: [], nextBefore: null };

  let query = filteredQuery(filters, tagFilteredIds);
  if (before) query = query.lt('transaction_date', before);
  const rows = (unwrap(await query.range(0, size - 1)) as unknown as RawWithRefs[]).map(
    normalizeTags,
  );
  if (rows.length < size) return { rows, nextBefore: null };

  // Full page: the oldest day may continue past it — fetch that whole day.
  const lastDate = rows[rows.length - 1]!.transaction_date;
  const lastDay = (
    unwrap(
      await filteredQuery(filters, tagFilteredIds)
        .eq('transaction_date', lastDate)
        .range(0, MAX_PAGE_SIZE - 1),
    ) as unknown as RawWithRefs[]
  ).map(normalizeTags);
  return {
    rows: [...rows.filter((t) => t.transaction_date !== lastDate), ...lastDay],
    nextBefore: lastDate,
  };
}

export async function getTransaction(id: string): Promise<TransactionWithRefs> {
  const row = unwrap(
    await supabase.from('transactions').select(WITH_REFS).eq('id', id).single(),
  ) as unknown as RawWithRefs;
  return normalizeTags(row);
}

export async function createTransaction(input: TransactionCreateInput): Promise<Transaction> {
  const payload = transactionCreateSchema.parse(input) as InsertRow<'transactions'>;
  return unwrap(
    await supabase.from('transactions').insert(payload).select().single(),
  ) as Transaction;
}

/** Inserts many transactions in one round trip (e.g. an import run) — a
 * single `INSERT ... VALUES (...), (...) RETURNING *`, so the response rows
 * come back in the same order as `inputs`. */
export async function createTransactions(inputs: TransactionCreateInput[]): Promise<Transaction[]> {
  if (inputs.length === 0) return [];
  const payload = inputs.map((input) =>
    transactionCreateSchema.parse(input),
  ) as InsertRow<'transactions'>[];
  return unwrap(await supabase.from('transactions').insert(payload).select()) as Transaction[];
}

export async function updateTransaction(
  id: string,
  patch: TransactionUpdateInput,
): Promise<Transaction> {
  const payload = transactionUpdateSchema.parse(patch) as UpdateRow<'transactions'>;
  // A patch is a partial — a key that's simply absent leaves that column
  // untouched. So switching `type` without also nulling the previous type's
  // exclusive fields (e.g. an expense's `category_id` surviving a switch to
  // `transfer`) leaves the row in a shape `transactions_transfer_shape`
  // rejects, or worse, silently matching no check at all if it doesn't.
  if (payload.type === 'transfer') {
    payload.category_id = null;
    if (payload.to_account_id) payload.goal_id = null;
    else if (payload.goal_id) payload.to_account_id = null;
  } else if (payload.type) {
    payload.to_account_id = null;
    payload.goal_id = null;
  }
  return unwrap(
    await supabase.from('transactions').update(payload).eq('id', id).select().single(),
  ) as Transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new SupabaseError(error);
}
