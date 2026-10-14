import { supabase } from './client';
import { unwrap } from './internal';

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
