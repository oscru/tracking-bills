/**
 * Derivations from the server-side summaries (`account_balance_effects`,
 * `monthly_category_totals`) — the same numbers `accountBalances`,
 * `totalBalancesByCurrency`, `monthTotals`, `categorySpendBreakdown` and
 * `monthlyIncomeExpenseHistory` compute from the full transaction list, but
 * from a few hundred pre-summed rows instead of the whole history.
 * Structural types (not the supabase ones) so utils stay free of the data layer.
 */

interface EffectRow {
  account_id: string;
  net: number;
}

interface SummaryRow {
  month: string;
  currency: string;
  type: 'income' | 'expense';
  category_id: string | null;
  total: number;
}

interface SummaryAccount {
  id: string;
  initial_balance: number | string;
  currency: string;
  include_in_total?: boolean;
}

interface SummaryCategory {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

const cents = (n: number | string) => Math.round(Number(n) * 100);
const fromCents = (c: number) => c / 100;

/** Each account's balance: its `initial_balance` + the server-summed net of its settled transactions. */
export function balancesFromEffects(
  accounts: SummaryAccount[],
  effects: EffectRow[],
): Map<string, number> {
  const net = new Map(effects.map((e) => [e.account_id, cents(e.net)]));
  const balances = new Map<string, number>();
  for (const a of accounts) {
    balances.set(a.id, fromCents(cents(a.initial_balance) + (net.get(a.id) ?? 0)));
  }
  return balances;
}

/** `totalBalancesByCurrency`, from already-computed per-account balances. */
export function totalsByCurrencyFromBalances(
  accounts: SummaryAccount[],
  balances: Map<string, number>,
): { currency: string; total: number; accountCount: number }[] {
  const byCurrency = new Map<string, { totalCents: number; accountCount: number }>();
  for (const a of accounts) {
    if (a.include_in_total === false) continue;
    const entry = byCurrency.get(a.currency) ?? { totalCents: 0, accountCount: 0 };
    entry.totalCents += cents(balances.get(a.id) ?? 0);
    entry.accountCount += 1;
    byCurrency.set(a.currency, entry);
  }
  return [...byCurrency.entries()]
    .map(([currency, { totalCents, accountCount }]) => ({
      currency,
      total: fromCents(totalCents),
      accountCount,
    }))
    .sort((a, b) => b.total - a.total);
}

/** `monthTotals` for a `YYYY-MM` month — one row per currency, busiest first. */
export function monthTotalsFromSummary(
  rows: SummaryRow[],
  month: string,
): { currency: string; income: number; expense: number }[] {
  const byCurrency = new Map<string, { income: number; expense: number }>();
  for (const r of rows) {
    if (r.month !== month) continue;
    const entry = byCurrency.get(r.currency) ?? { income: 0, expense: 0 };
    entry[r.type] += cents(r.total);
    byCurrency.set(r.currency, entry);
  }
  return [...byCurrency.entries()]
    .map(([currency, { income, expense }]) => ({
      currency,
      income: fromCents(income),
      expense: fromCents(expense),
    }))
    .sort((a, b) => b.income + b.expense - (a.income + a.expense));
}

/**
 * `categorySpendBreakdown` for a `YYYY-MM` month, per currency (currencies
 * with spend only, biggest first). Uncategorized — or deleted-category —
 * spend rolls into one "Sin categoría" bucket.
 */
export function categorySpendFromSummary(
  rows: SummaryRow[],
  month: string,
  categories: SummaryCategory[],
): {
  currency: string;
  breakdown: {
    categoryId: string | null;
    name: string;
    color: string;
    icon: string | null;
    total: number;
  }[];
}[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const byCurrency = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (r.month !== month || r.type !== 'expense') continue;
    const key = r.category_id && byId.has(r.category_id) ? r.category_id : '__none__';
    const totals = byCurrency.get(r.currency) ?? new Map<string, number>();
    totals.set(key, (totals.get(key) ?? 0) + cents(r.total));
    byCurrency.set(r.currency, totals);
  }
  return [...byCurrency.entries()]
    .map(([currency, totals]) => ({
      currency,
      breakdown: [...totals.entries()]
        .map(([key, c]) => {
          const category = key === '__none__' ? undefined : byId.get(key);
          return {
            categoryId: category?.id ?? null,
            name: category?.name ?? 'Sin categoría',
            color: category?.color ?? '#94A3B8',
            icon: category?.icon ?? null,
            total: fromCents(c),
          };
        })
        .sort((a, b) => b.total - a.total),
    }))
    .filter((g) => g.breakdown.length > 0)
    .sort(
      (a, b) =>
        b.breakdown.reduce((s, c) => s + c.total, 0) - a.breakdown.reduce((s, c) => s + c.total, 0),
    );
}

/**
 * `monthlyIncomeExpenseHistory` per currency: income/expense for the
 * `months` months ending at `referenceDate`'s month, oldest first.
 */
export function monthlyHistoryFromSummary(
  rows: SummaryRow[],
  months: number,
  referenceDate: Date = new Date(),
): { currency: string; history: { month: string; income: number; expense: number }[] }[] {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const inWindow = new Set(keys);
  const byCurrency = new Map<
    string,
    { count: number; months: Map<string, { income: number; expense: number }> }
  >();
  for (const r of rows) {
    let entry = byCurrency.get(r.currency);
    if (!entry) {
      entry = { count: 0, months: new Map() };
      byCurrency.set(r.currency, entry);
    }
    entry.count += 1;
    if (!inWindow.has(r.month)) continue;
    const bucket = entry.months.get(r.month) ?? { income: 0, expense: 0 };
    bucket[r.type] += cents(r.total);
    entry.months.set(r.month, bucket);
  }
  return [...byCurrency.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([currency, { months: totals }]) => ({
      currency,
      history: keys.map((month) => {
        const bucket = totals.get(month) ?? { income: 0, expense: 0 };
        return { month, income: fromCents(bucket.income), expense: fromCents(bucket.expense) };
      }),
    }));
}
