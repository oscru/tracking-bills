import type { TransactionWithRefs } from '@repo/core/supabase';
import { addDaysISO, formatDate, todayISODate } from '@repo/core/utils';

export interface DaySection {
  date: string;
  data: TransactionWithRefs[];
  /** Income − expense for the day (transfers excluded, same convention as `monthTotals`). */
  net: number;
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
    let net = 0;
    for (const t of data) {
      if (t.type === 'income') net += Number(t.amount);
      else if (t.type === 'expense') net -= Number(t.amount);
    }
    return { date, data, net };
  });
}

/** `YYYY-MM-DD` -> "Hoy" / "Ayer" / a medium localized date. */
export function dayHeaderLabel(iso: string): string {
  const today = todayISODate();
  if (iso === today) return 'Hoy';
  if (iso === addDaysISO(today, -1)) return 'Ayer';
  return formatDate(iso);
}
