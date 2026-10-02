import { useBudgets, useTransactions } from '@repo/core/hooks';
import { budgetProgress, formatDate } from '@repo/core/utils';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BudgetProgressBar } from '../budgets/budget-progress-bar';

/** Every active budget's current occurrence — the fuller, "Ver todas"-style
 * counterpart to Home's top-3 preview. Budgets are now anchored to their own
 * `start_date` rather than the calendar, so this no longer tries to force
 * anything onto whichever month Análisis happens to be showing — it's always
 * "right now", same as Home. Each budget shows in its own locked currency. */
export function BudgetsProgressCard() {
  const router = useRouter();
  const { data: budgets } = useBudgets();
  const { data: transactions } = useTransactions();

  const rows = useMemo(() => {
    return (budgets ?? [])
      .filter((b) => !b.archived)
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
  }, [budgets, transactions]);

  if (rows.length === 0) return null;

  return (
    <View className="gap-4 rounded-card bg-surface p-5 dark:bg-surface-dark">
      <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">Presupuestos</Text>
      {rows.map(({ budget, progress }) => (
        <Pressable
          key={budget.id}
          onPress={() => router.push({ pathname: '/(app)/settings/budgets/[id]', params: { id: budget.id } })}
          className="gap-2"
        >
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-sm text-ink dark:text-ink-dark" numberOfLines={1}>
              {budget.name}
            </Text>
            <Text className="text-xs font-semibold text-ink-3 dark:text-ink-3-dark">
              {formatDate(progress.from)} – {formatDate(progress.to)}
            </Text>
          </View>
          <BudgetProgressBar
            spent={progress.spent}
            amount={Number(budget.amount)}
            pct={progress.pct}
            isOverBudget={progress.isOverBudget}
            currency={budget.currency}
          />
        </Pressable>
      ))}
    </View>
  );
}
