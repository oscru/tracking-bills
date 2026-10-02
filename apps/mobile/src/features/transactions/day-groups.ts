import type { TransactionWithRefs } from '@repo/core/supabase';
import { addDaysISO, formatDate, todayISODate } from '@repo/core/utils';

export interface DayNet {
  currency: string;
  net: number;
}

export interface DaySection {
  date: string;
  data: TransactionWithRefs[];
  /**
   * Income − expense for the day (transfers excluded, same convention as
   * `monthTotals`), one entry per currency that moved that day — never
   * blended together. Only settled transactions count. Highest-magnitude
   * currency first.
   */
  nets: DayNet[];
}

/** Groups an already date-sorted (desc) transaction list into per-day sections. */
export function groupByDay(transactions: TransactionWithRefs[]): DaySection[] {
  const order: string[] = [];
  const byDate = new Map<string, TransactionWithRefs[]>();
  for (const t of transactions) {
    if (!byDate.has(t.transaction_date)) {
      byDate.set(t.transaction_date, []);
      order.push(t.transaction_date);
    }
    byDate.get(t.transaction_date)!.push(t);
  }
  return order.map((date) => {
    const data = byDate.get(date)!;
    const byCurrency = new Map<string, number>();
    for (const t of data) {
      if (!t.is_completed) continue;
      if (t.type !== 'income' && t.type !== 'expense') continue;
      const currency = t.account?.currency ?? 'MXN';
      const delta = t.type === 'income' ? Number(t.amount) : -Number(t.amount);
      byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + delta);
    }
    const nets = [...byCurrency.entries()]
      .map(([currency, net]) => ({ currency, net }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    return { date, data, nets };
  });
}

/** `YYYY-MM-DD` -> "Hoy" / "Ayer" / a medium localized date. */
export function dayHeaderLabel(iso: string): string {
  const today = todayISODate();
  if (iso === today) return 'Hoy';
  if (iso === addDaysISO(today, -1)) return 'Ayer';
  return formatDate(iso);
}
