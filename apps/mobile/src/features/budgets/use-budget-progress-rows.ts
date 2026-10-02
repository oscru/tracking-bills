import { useBudgets, useTransactions } from '@repo/core/hooks';
import { budgetProgress } from '@repo/core/utils';
import { useMemo } from 'react';

/**
 * Every active budget's current-period progress, worst-first (highest %
 * spent). Shared by Home's top-3 preview and Analytics' full list so the two
 * never silently diverge on how progress is computed — they previously
 * copied this ~15-line block verbatim, and it already had (the top-3 slice
 * aside).
 *
 * `currency`, when given, scopes the result to one currency (Analytics is
 * scoped to one at a time on screen); omit it for Home, which isn't.
 */
export function useBudgetProgressRows(currency?: string) {
  const { data: budgets } = useBudgets();
  const { data: transactions } = useTransactions();

  return useMemo(() => {
    return (budgets ?? [])
      .filter((budget) => !budget.archived && (currency == null || budget.currency === currency))
      .map((budget) => {
        const categoryIds = budget.categories.map((c) => c.category.id);
        return {
          budget,
          progress: budgetProgress(
            categoryIds,
            Number(budget.amount),
            budget.currency,
            budget,
            transactions ?? [],
          ),
        };
      })
      .sort((a, b) => b.progress.pct - a.progress.pct);
  }, [budgets, transactions, currency]);
}
