/**
 * Currency / date / calculation helpers. UI-agnostic and pure.
 */
import type { Category, CategoryNode } from '../types';

export * from './errors';

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
}
interface BalanceTx {
  type: string;
  amount: number | string;
  account_id: string;
  to_account_id: string | null;
}

/** Running balance of one account: initial + income − expense − transfers out + transfers in. */
export function accountBalance(account: BalanceAccount, transactions: BalanceTx[]): number {
  let balance = Number(account.initial_balance);
  for (const t of transactions) {
    const amount = Number(t.amount);
    if (t.type === 'transfer') {
      if (t.account_id === account.id) balance -= amount;
      if (t.to_account_id === account.id) balance += amount;
    } else if (t.account_id === account.id) {
      balance += t.type === 'income' ? amount : -amount;
    }
  }
  return balance;
}

/** Net worth across accounts (transfers cancel out). */
export function totalBalance(accounts: BalanceAccount[], transactions: BalanceTx[]): number {
  return accounts.reduce((sum, a) => sum + accountBalance(a, transactions), 0);
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
