/**
 * Currency / date / calculation helpers. UI-agnostic and pure.
 */

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

/** Today's date as `YYYY-MM-DD` in local time. */
export function todayISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
