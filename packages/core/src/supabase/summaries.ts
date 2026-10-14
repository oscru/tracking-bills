import { supabase } from './client';
import { SupabaseError, unwrap } from './internal';

/**
 * Server-side aggregates over the ledger (views in
 * `20261014120000_transaction_summaries.sql`), for screens that only need
 * totals — far smaller than the full transaction history and already summed
 * by Postgres. Both views only count settled (`is_completed`) rows.
 */

/** One account's net of settled transactions — add `initial_balance` for its balance. */
export interface AccountBalanceEffect {
  account_id: string;
  net: number;
}

/** Settled income/expense for one month (`YYYY-MM`), account currency and category. */
export interface MonthlyCategoryTotal {
  month: string;
  currency: string;
  type: 'income' | 'expense';
  category_id: string | null;
  total: number;
  count: number;
}

const PAGE_SIZE = 1000;

export async function listAccountBalanceEffects(): Promise<AccountBalanceEffect[]> {
  const rows = unwrap(await supabase.from('account_balance_effects').select('account_id, net'));
  return rows
    .filter((r): r is { account_id: string; net: number } => r.account_id != null)
    .map((r) => ({ account_id: r.account_id, net: Number(r.net ?? 0) }));
}

/** Every month's rows — paged, since years × categories can pass PostgREST's 1000-row cap. */
export async function listMonthlyCategoryTotals(): Promise<MonthlyCategoryTotal[]> {
  const all: MonthlyCategoryTotal[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = unwrap(
      await supabase
        .from('monthly_category_totals')
        .select('month, currency, type, category_id, total, count')
        .order('month', { ascending: false })
        .order('currency')
        .order('type')
        .order('category_id', { nullsFirst: true })
        .range(offset, offset + PAGE_SIZE - 1),
    );
    for (const r of page) {
      if (!r.month || !r.currency || (r.type !== 'income' && r.type !== 'expense')) continue;
      all.push({
        month: r.month,
        currency: r.currency,
        type: r.type,
        category_id: r.category_id,
        total: Number(r.total ?? 0),
        count: r.count ?? 0,
      });
    }
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}

/** One day's activity in one currency and type — `total` sums settled rows only. */
export interface DailyTotal {
  date: string;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  total: number;
  count: number;
}

/** Every day with any activity — paged, like `listMonthlyCategoryTotals`. */
export async function listDailyTotals(): Promise<DailyTotal[]> {
  const all: DailyTotal[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = unwrap(
      await supabase
        .from('daily_totals')
        .select('date, currency, type, total, count')
        .order('date', { ascending: false })
        .order('currency')
        .order('type')
        .range(offset, offset + PAGE_SIZE - 1),
    );
    for (const r of page) {
      if (!r.date || !r.currency) continue;
      if (r.type !== 'income' && r.type !== 'expense' && r.type !== 'transfer') continue;
      all.push({
        date: r.date,
        currency: r.currency,
        type: r.type,
        total: Number(r.total ?? 0),
        count: r.count ?? 0,
      });
    }
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}

/** One day's activity in one category and currency — `total` sums settled rows only. */
export interface CategoryDailyTotal {
  date: string;
  currency: string;
  category_id: string;
  total: number;
  count: number;
}

/** Every day any of `categoryIds` was used, oldest first — paged, like the other summaries. */
export async function listCategoryDailyTotals(
  categoryIds: readonly string[],
): Promise<CategoryDailyTotal[]> {
  if (categoryIds.length === 0) return [];
  const all: CategoryDailyTotal[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = unwrap(
      await supabase
        .from('daily_category_totals')
        .select('date, currency, category_id, total, count')
        .in('category_id', [...categoryIds])
        .order('date')
        .order('currency')
        .order('category_id')
        .range(offset, offset + PAGE_SIZE - 1),
    );
    for (const r of page) {
      if (!r.date || !r.currency || !r.category_id) continue;
      all.push({
        date: r.date,
        currency: r.currency,
        category_id: r.category_id,
        total: Number(r.total ?? 0),
        count: r.count ?? 0,
      });
    }
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}

/** How many income and expense movements (any status) an account has — counted by Postgres, no rows sent. */
export async function countAccountTransactions(
  accountId: string,
): Promise<{ income: number; expense: number }> {
  const count = async (type: 'income' | 'expense') => {
    const { count: n, error } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('type', type);
    if (error) throw new SupabaseError(error);
    return n ?? 0;
  };
  const [income, expense] = await Promise.all([count('income'), count('expense')]);
  return { income, expense };
}

/** Income/expense movement counts (any status) for every tag, keyed by tag id. */
export async function listTagTransactionCounts(): Promise<
  Map<string, { expense: number; income: number }>
> {
  const rows = unwrap(await supabase.from('tag_transaction_counts').select('tag_id, type, count'));
  const counts = new Map<string, { expense: number; income: number }>();
  for (const r of rows) {
    if (!r.tag_id || (r.type !== 'income' && r.type !== 'expense')) continue;
    const entry = counts.get(r.tag_id) ?? { expense: 0, income: 0 };
    entry[r.type] = r.count ?? 0;
    counts.set(r.tag_id, entry);
  }
  return counts;
}

/**
 * An account's net of settled movements strictly before `(date, createdAt)`
 * in the ledger — or of all of them when `date` is null. Add its
 * `initial_balance` for the balance at that point. Summed by Postgres.
 */
export async function accountNetBefore(
  accountId: string,
  date: string | null,
  createdAt: string | null,
): Promise<number> {
  const net = unwrap(
    await supabase.rpc(
      'account_net_before',
      date && createdAt
        ? { p_account_id: accountId, p_date: date, p_created_at: createdAt }
        : { p_account_id: accountId },
    ),
  );
  return Number(net ?? 0);
}
