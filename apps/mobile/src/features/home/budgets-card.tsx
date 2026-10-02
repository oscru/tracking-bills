import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { BudgetProgressBar } from '../budgets/budget-progress-bar';
import { useBudgetProgressRows } from '../budgets/use-budget-progress-rows';

const TOP_N = 3;

/** Home's "at a glance" budget status — the envelopes closest to (or past)
 * their current-period limit, most urgent first. Each budget shows in its
 * own locked currency — they're not blended into a single number. */
export function BudgetsCard() {
  const router = useRouter();
  const rows = useBudgetProgressRows();

  // A budget with no categories isn't "under control" — it's broken, just
  // quiet about it (`isOverBudget` is false because nothing can ever be
  // counted as spent against it).
  const onTrack = rows.filter((r) => r.progress.hasCategories && !r.progress.isOverBudget).length;

  return (
    <View className="gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">Presupuestos</Text>
        <Pressable onPress={() => router.push('/(app)/settings/budgets')} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            Ver todos ›
          </Text>
        </Pressable>
      </View>

      {rows.length === 0 ? (
        <Pressable
          onPress={() => router.push('/(app)/settings/budgets/new')}
          className="items-center gap-1 py-4"
        >
          <Text className="text-sm font-medium text-lime-ink dark:text-lime-ink-dark">
            + Crea tu primer presupuesto
          </Text>
          <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
            Ponle un límite semanal, quincenal o mensual a tus categorías
          </Text>
        </Pressable>
      ) : (
        <>
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {onTrack} de {rows.length} bajo control este periodo
          </Text>
          <View className="gap-4">
            {rows.slice(0, TOP_N).map(({ budget, progress }) => (
              <Pressable
                key={budget.id}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/settings/budgets/[id]',
                    params: { id: budget.id },
                  })
                }
                className="gap-2"
              >
                <Text className="text-sm text-ink dark:text-ink-dark" numberOfLines={1}>
                  {budget.name}
                </Text>
                <BudgetProgressBar
                  spent={progress.spent}
                  amount={Number(budget.amount)}
                  pct={progress.pct}
                  isOverBudget={progress.isOverBudget}
                  currency={budget.currency}
                  hasCategories={progress.hasCategories}
                />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
