import { useQuery } from '@tanstack/react-query';

import {
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
