import { useQuery } from '@tanstack/react-query';

import {
  accountNetBefore,
  countAccountTransactions,
  listTagTransactionCounts,
  listAccountBalanceEffects,
  listCategoryDailyTotals,
  listDailyTotals,
  listMonthlyCategoryTotals,
} from '../supabase';
import { queryKeys } from './keys';

/** Per-account net of settled transactions, summed by Postgres (see `balancesFromEffects`). */
export function useAccountBalanceEffects() {
  return useQuery({
    queryKey: queryKeys.transactions.balanceEffects(),
    queryFn: listAccountBalanceEffects,
  });
}

/** Settled income/expense per month × currency × category, summed by Postgres. */
export function useMonthlyCategoryTotals() {
  return useQuery({
    queryKey: queryKeys.transactions.monthlyTotals(),
    queryFn: listMonthlyCategoryTotals,
  });
}

/** Per-day settled totals over the whole history (Análisis' streaks), summed by Postgres. */
export function useDailyTotals() {
  return useQuery({
    queryKey: queryKeys.transactions.dailyTotals(),
    queryFn: listDailyTotals,
  });
}

/** Per-day settled totals of these categories over their whole history, summed by Postgres. */
export function useCategoryDailyTotals(categoryIds: readonly string[], { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.categoryDailyTotals(categoryIds),
    queryFn: () => listCategoryDailyTotals(categoryIds),
    enabled: enabled && categoryIds.length > 0,
  });
}

/** An account's income/expense movement counts, counted by Postgres. */
export function useAccountTransactionCounts(accountId: string) {
  return useQuery({
    queryKey: queryKeys.transactions.accountCounts(accountId),
    queryFn: () => countAccountTransactions(accountId),
    enabled: Boolean(accountId),
  });
}

/** Income/expense movement counts per tag id, counted by Postgres. */
export function useTagTransactionCounts() {
  return useQuery({
    queryKey: queryKeys.transactions.tagCounts(),
    queryFn: listTagTransactionCounts,
  });
}

/**
 * An account's net of settled movements before a point in the ledger
 * (`date` + `createdAt`), or of all of them when `date` is null — see
 * `accountNetBefore`. Disabled while `accountId` is null.
 */
export function useAccountNetBefore(
  accountId: string | null | undefined,
  date: string | null,
  createdAt: string | null,
) {
  return useQuery({
    queryKey: queryKeys.transactions.netBefore(accountId ?? '', date, createdAt),
    queryFn: () => accountNetBefore(accountId!, date, createdAt),
    enabled: Boolean(accountId),
  });
}
