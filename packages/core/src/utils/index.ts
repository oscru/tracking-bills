/**
 * Currency / date / calculation helpers. UI-agnostic and pure.
 */
import { HOME_LAYOUT_ITEMS, type HomeLayoutItem } from '../home-layout';
import type { Category, CategoryNode } from '../types';

export * from './errors';
export { HOME_LAYOUT_ITEMS, type HomeLayoutItem };

/** Format a numeric amount as a localized currency string. */
export function formatCurrency(amount: number, currency = 'MXN', locale = 'es-MX'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/** Signed amount for a transaction: expenses are negative, income positive. */
export function signedAmount(type: 'income' | 'expense', amount: number): number {
  return type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
}

/**
 * Evaluate a plain arithmetic expression from the numeric keypad
 * (`"150 × 3"`, `"1,250 + 340 ÷ 2"`). Supports + − × ÷ with the usual
 * precedence and a leading unary minus. Returns the result rounded to 2
 * decimals, or `null` if the expression is invalid / divides by zero.
 */
export function evalAmount(expr: string): number | null {
  const s = expr
    .replace(/[×✕xX*]/g, '*')
    .replace(/[÷/]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/,/g, '')
    .replace(/\s+/g, '');
  if (!s || !/^[0-9.+\-*/]+$/.test(s)) return null;

  const tokens: (number | string)[] = [];
  for (let i = 0; i < s.length;) {
    const c = s[i]!;
    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j]!)) j++;
      const num = Number(s.slice(i, j));
      if (!Number.isFinite(num)) return null;
      tokens.push(num);
      i = j;
    } else if ('+-*/'.includes(c)) {
      const prev = tokens[tokens.length - 1];
      if (c === '-' && (prev === undefined || typeof prev === 'string')) {
        tokens.push(0); // unary minus -> 0 - x
      } else if (prev === undefined || typeof prev === 'string') {
        return null; // operator with no left operand
      }
      tokens.push(c);
      i += 1;
    } else {
      return null;
    }
  }
  if (typeof tokens[tokens.length - 1] === 'string') return null;

  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const rpn: (number | string)[] = [];
  const ops: string[] = [];
  for (const t of tokens) {
    if (typeof t === 'number') {
      rpn.push(t);
    } else {
      while (ops.length && prec[ops[ops.length - 1]!]! >= prec[t]!) rpn.push(ops.pop()!);
      ops.push(t);
    }
  }
  while (ops.length) rpn.push(ops.pop()!);

  const stack: number[] = [];
  for (const t of rpn) {
    if (typeof t === 'number') {
      stack.push(t);
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) return null;
    if (t === '+') stack.push(a + b);
    else if (t === '-') stack.push(a - b);
    else if (t === '*') stack.push(a * b);
    else if (b === 0) return null;
    else stack.push(a / b);
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0]!)) return null;
  return Math.round(stack[0]! * 100) / 100;
}

const KEYPAD_OPS: Record<string, string> = { add: '+', sub: '-', mul: '*', div: '/' };

/**
 * Apply one keypad press to the raw amount expression string.
 * `key` is one of `0`-`9`, `.`, `clear`, `back`, `add`, `sub`, `mul`, `div`,
 * `equals` (matches `@repo/ui`'s `KeypadKey`).
 */
export function applyAmountKey(expr: string, key: string): string {
  if (key === 'clear') return '';
  if (key === 'back') return expr.slice(0, -1);
  if (key === 'equals') {
    const value = evalAmount(expr);
    return value == null ? expr : String(value);
  }

  const op = KEYPAD_OPS[key];
  if (op) {
    if (expr === '') return op === '-' ? '-' : '';
    if (/[+\-*/]$/.test(expr)) return expr.slice(0, -1) + op;
    return expr + op;
  }

  const segment = expr.split(/[+\-*/]/).pop() ?? '';

  if (key === '.') {
    if (segment.includes('.')) return expr;
    return expr + (segment === '' ? '0.' : '.');
  }

  if (/^[0-9]$/.test(key)) {
    if (segment === '0' && key === '0') return expr;
    if (segment === '0') return expr.slice(0, -1) + key;
    if (segment.replace('.', '').length >= 12) return expr;
    return expr + key;
  }

  return expr;
}

// --- categories -----------------------------------------------------------

/** Group a flat category list into `{ ...parent, children }` nodes (one level). */
export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const byParent = new Map<string, Category[]>();
  const roots: Category[] = [];
  for (const c of categories) {
    if (c.parent_id) {
      const list = byParent.get(c.parent_id) ?? [];
      list.push(c);
      byParent.set(c.parent_id, list);
    } else {
      roots.push(c);
    }
  }
  const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);
  return roots.map((r) => ({
    ...r,
    children: (byParent.get(r.id) ?? []).sort(byName),
  }));
}

// --- balances -----------------------------------------------------------

interface BalanceAccount {
  id: string;
  initial_balance: number | string;
  /** Whether this account counts toward `totalBalance` — its own `accountBalance` is unaffected. */
  include_in_total?: boolean;
}
interface BalanceTx {
  type: string;
  amount: number | string;
  account_id: string;
  to_account_id: string | null;
  is_completed: boolean;
}

/** One transaction's signed effect on one account's balance, regardless of `is_completed`. */
function transactionEffect(t: BalanceTx, accountId: string): number {
  const amount = Number(t.amount);
  if (t.type === 'transfer') {
    let delta = 0;
    if (t.account_id === accountId) delta -= amount;
    if (t.to_account_id === accountId) delta += amount;
    return delta;
  }
  return t.account_id === accountId ? (t.type === 'income' ? amount : -amount) : 0;
}

/**
 * Running balance of one account: initial + every *settled* transaction's
 * effect. A planned/pending one (`is_completed: false`, e.g. a scheduled
 * payment) doesn't touch it until it actually settles — that's what keeps
 * this number an accurate record of the money really in the account.
 */
export function accountBalance(account: BalanceAccount, transactions: BalanceTx[]): number {
  let balance = Number(account.initial_balance);
  for (const t of transactions) {
    if (!t.is_completed) continue;
    balance += transactionEffect(t, account.id);
  }
  return balance;
}

/**
 * `accountBalance`, plus one specific transaction's effect even if it's
 * still pending — "what would this account's balance be if `pending`
 * settled", for planning ahead without pretending it already has.
 */
export function projectedAccountBalance(
  account: BalanceAccount,
  transactions: BalanceTx[],
  pending: BalanceTx,
): number {
  return accountBalance(account, transactions) + transactionEffect(pending, account.id);
}

/** Net worth across accounts opted into the total (transfers cancel out). */
export function totalBalance(accounts: BalanceAccount[], transactions: BalanceTx[]): number {
  return accounts
    .filter((a) => a.include_in_total !== false)
    .reduce((sum, a) => sum + accountBalance(a, transactions), 0);
}

interface RankableFavorite {
  type: string;
  use_count: number;
  created_at: string;
}

/**
 * Ranks favorites by actual use (most-tapped first, ties broken by most
 * recently created), optionally narrowed to one `type`, capped at `limit`.
 * Shared by every surface that features "your top favorites" — the stories
 * row and the calculator's quick-fill pills — so they always agree.
 */
export function topFavorites<T extends RankableFavorite>(
  favorites: T[],
  { type, limit = 6 }: { type?: string; limit?: number } = {},
): T[] {
  const pool = type ? favorites.filter((f) => f.type === type) : favorites;
  return [...pool]
    .sort((a, b) => b.use_count - a.use_count || b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

interface PendingTx {
  transaction_date: string;
  is_completed: boolean;
}

/**
 * Splits not-yet-settled transactions by date, relative to `today`
 * (`YYYY-MM-DD`): `overdue` (dated before today — should have happened
 * already) vs `upcoming` (today or later — still ahead of schedule). Powers
 * the home screen's two reminder cards, which mean very different things:
 * overdue needs attention now, upcoming is just a heads-up.
 */
export function splitPendingByDate<T extends PendingTx>(
  transactions: T[],
  today: string,
): { overdue: T[]; upcoming: T[] } {
  const pending = transactions.filter((t) => !t.is_completed);
  return {
    overdue: pending.filter((t) => t.transaction_date < today),
    upcoming: pending.filter((t) => t.transaction_date >= today),
  };
}

/** Calendar days from `today` to a later `dateISO` (both `YYYY-MM-DD`) — 0 if same day. */
export function daysUntil(dateISO: string, today: string): number {
  const [y1, m1, d1] = today.split('-').map(Number);
  const [y2, m2, d2] = dateISO.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  const a = new Date(y1, m1 - 1, d1).getTime();
  const b = new Date(y2, m2 - 1, d2).getTime();
  return Math.round((b - a) / 86_400_000);
}

interface TagCountTx {
  type: string;
  tags: { id: string }[];
}

/** How many expense/income transactions carry this tag (transfers aren't counted). */
export function tagCounts(tagId: string, transactions: TagCountTx[]): { expense: number; income: number } {
  let expense = 0;
  let income = 0;
  for (const t of transactions) {
    if (!t.tags.some((tag) => tag.id === tagId)) continue;
    if (t.type === 'expense') expense++;
    else if (t.type === 'income') income++;
  }
  return { expense, income };
}

/** Income / expense totals for a `YYYY-MM` month, excluding transfers. */
export function monthTotals(
  transactions: { type: string; amount: number | string; transaction_date: string }[],
  month: string,
): { income: number; expense: number } {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (!t.transaction_date.startsWith(month)) continue;
    if (t.type === 'income') income += Number(t.amount);
    else if (t.type === 'expense') expense += Number(t.amount);
  }
  return { income, expense };
}

export interface CategorySpend {
  categoryId: string | null;
  name: string;
  color: string;
  icon: string | null;
  /** Total expensed, always positive. */
  total: number;
}

interface SpendTx {
  type: string;
  amount: number | string;
  transaction_date: string;
  category: { id: string; name: string; color: string | null; icon: string | null } | null;
}

/**
 * Expense total per category for a `YYYY-MM` month, highest first. Transfers
 * and income aren't counted; uncategorized expenses roll into one "Sin
 * categoría" bucket so the breakdown always accounts for the full month.
 */
export function categorySpendBreakdown(transactions: SpendTx[], month: string): CategorySpend[] {
  const byCategory = new Map<string, CategorySpend>();
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.transaction_date.startsWith(month)) continue;
    const key = t.category?.id ?? '__none__';
    const entry = byCategory.get(key);
    if (entry) {
      entry.total += Number(t.amount);
    } else {
      byCategory.set(key, {
        categoryId: t.category?.id ?? null,
        name: t.category?.name ?? 'Sin categoría',
        color: t.category?.color ?? '#94A3B8',
        icon: t.category?.icon ?? null,
        total: Number(t.amount),
      });
    }
  }
  return [...byCategory.values()].sort((a, b) => b.total - a.total);
}

/** Today's date as `YYYY-MM-DD` in local time. */
export function todayISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `YYYY-MM-DD` shifted by `days` (negative goes back), in local time. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return todayISODate(date);
}

/** `YYYY-MM-DD` -> a medium, localized label, e.g. "7 Sep 2026". */
export function formatDate(iso: string, locale = 'es-MX'): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** A `timestamptz` ISO string -> a localized date + time label, e.g. "7 sep 2026, 10:32 a.m." */
export function formatDateTime(iso: string, locale = 'es-MX'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * A `timestamptz` ISO string -> "Recién {verb}" for the first hour, "{Verb}
 * hoy/ayer/antier/hace N días" by calendar day through day 6, then "{Verb} el
 * 7 sep 2026" beyond that. `verb` is a lowercase past participle, e.g.
 * "creado" or "editado". Calendar-day based (midnight to midnight, local
 * time), not a rolling 24h window, so "ayer" holds all day even if it was
 * under 24h ago.
 */
export function formatActivityMoment(iso: string, verb: string, locale = 'es-MX'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const now = new Date();
  if (now.getTime() - date.getTime() < 60 * 60 * 1000) return `Recién ${verb}`;

  const cap = verb.charAt(0).toUpperCase() + verb.slice(1);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return `${cap} hoy`;
  if (days === 1) return `${cap} ayer`;
  if (days === 2) return `${cap} antier`;
  if (days >= 3 && days <= 6) return `${cap} hace ${days} días`;

  const dateLabel = date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${cap} el ${dateLabel}`;
}

/** `YYYY-MM` -> a short localized month label, e.g. "sep" (or "sep 25" outside the current year). */
export function formatMonthShort(monthKey: string, locale = 'es-MX'): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const label = new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'short' });
  const currentYear = new Date().getFullYear();
  return y === currentYear ? label : `${label} ${String(y).slice(2)}`;
}

interface CategoryHistoryTx {
  category_id: string | null;
  amount: number | string;
  transaction_date: string;
}

/**
 * One category's per-month totals for the last `months` months (oldest →
 * newest, including the current month). A transaction's category type
 * always matches its own type (enforced in the DB), so matching on
 * `category_id` alone is enough — no need to also filter by income/expense.
 */
export function categoryMonthlyHistory(
  transactions: CategoryHistoryTx[],
  categoryId: string,
  months: number,
  referenceDate: Date = new Date(),
): { month: string; total: number }[] {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const t of transactions) {
    if (t.category_id !== categoryId) continue;
    const key = t.transaction_date.slice(0, 7);
    if (!totals.has(key)) continue;
    totals.set(key, (totals.get(key) ?? 0) + Number(t.amount));
  }
  return keys.map((month) => ({ month, total: totals.get(month) ?? 0 }));
}

interface MonthlyTrendTx {
  type: string;
  amount: number | string;
  transaction_date: string;
}

/**
 * Income and expense totals per month for the last `months` months (oldest →
 * newest, including the current month), across all categories/accounts —
 * the whole-account counterpart to `categoryMonthlyHistory`. Transfers
 * aren't counted.
 */
export function monthlyIncomeExpenseHistory(
  transactions: MonthlyTrendTx[],
  months: number,
  referenceDate: Date = new Date(),
): { month: string; income: number; expense: number }[] {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const totals = new Map(keys.map((k) => [k, { income: 0, expense: 0 }]));
  for (const t of transactions) {
    const key = t.transaction_date.slice(0, 7);
    const bucket = totals.get(key);
    if (!bucket) continue;
    if (t.type === 'income') bucket.income += Number(t.amount);
    else if (t.type === 'expense') bucket.expense += Number(t.amount);
  }
  return keys.map((month) => ({ month, ...(totals.get(month) ?? { income: 0, expense: 0 }) }));
}

// --- home layout ----------------------------------------------------------

/**
 * Fills in a stored order with any item it's missing (a card added in a
 * later release, so it still shows up for existing users) and drops
 * anything no longer valid — always returns a full permutation of
 * `HOME_LAYOUT_ITEMS`.
 */
export function normalizeHomeLayout(stored: string[] | null | undefined): HomeLayoutItem[] {
  const known = new Set<string>(HOME_LAYOUT_ITEMS);
  const valid = (stored ?? []).filter((k): k is HomeLayoutItem => known.has(k));
  const missing = HOME_LAYOUT_ITEMS.filter((k) => !valid.includes(k));
  return [...valid, ...missing];
}

/** `normalizeHomeLayout`'s order, minus whatever's in `hiddenItems` — what Home actually renders. */
export function visibleHomeLayout(
  stored: string[] | null | undefined,
  hiddenItems: string[] | null | undefined,
): HomeLayoutItem[] {
  const hidden = new Set(hiddenItems ?? []);
  return normalizeHomeLayout(stored).filter((k) => !hidden.has(k));
}
