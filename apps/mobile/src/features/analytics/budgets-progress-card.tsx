import { formatDate } from '@repo/core/utils';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { BudgetProgressBar } from '../budgets/budget-progress-bar';
import { useBudgetProgressRows } from '../budgets/use-budget-progress-rows';

interface Props {
  /** Analytics scopes everything on screen to one currency at a time (no
   * exchange rate exists to blend them) — this card follows the same rule
   * instead of mixing every currency's budgets together. */
  currency: string;
}

/** Every active budget's current occurrence — the fuller, "Ver todas"-style
 * counterpart to Home's top-3 preview. Budgets are anchored to their own
 * `start_date` rather than the calendar, so this never tries to force
 * anything onto whichever month Análisis happens to be showing above it —
 * it's always "right now" for each budget's own cycle, same as Home (the
 * "Periodo actual" caption below makes that explicit, since this card sits
 * right under a month navigator that could otherwise read as scoping it
 * too). Each budget shows in its own locked currency. */
export function BudgetsProgressCard({ currency }: Props) {
  const router = useRouter();
  const rows = useBudgetProgressRows(currency);

  if (rows.length === 0) return null;

  return (
    <View className="gap-4 rounded-card bg-surface p-5 dark:bg-surface-dark">
      <View>
        <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">Presupuestos</Text>
        <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
          Periodo actual de cada presupuesto — no cambia con el mes de arriba
        </Text>
      </View>
      {rows.map(({ budget, progress }) => (
        <Pressable
          key={budget.id}
          onPress={() =>
            router.push({ pathname: '/(app)/settings/budgets/[id]', params: { id: budget.id } })
          }
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
            hasCategories={progress.hasCategories}
          />
        </Pressable>
      ))}
    </View>
  );
}
