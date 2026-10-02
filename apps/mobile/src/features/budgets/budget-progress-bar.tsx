import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '@repo/core/utils';
import { useColorScheme } from 'nativewind';
import { Text, View } from 'react-native';

interface Props {
  spent: number;
  amount: number;
  pct: number;
  isOverBudget: boolean;
  currency: string;
  /** `false` when the budget has no linked categories — a broken/empty state
   * that otherwise computes as "0% spent", indistinguishable from actually
   * being on track. Shown as an explicit warning instead of a healthy bar. */
  hasCategories: boolean;
}

/** A thin progress bar for one budget's current-period status — green under
 * budget, amber close to the limit, red over it. When the budget has no
 * categories assigned at all, shows an explicit warning instead (see
 * `BudgetProgress.hasCategories`) — that state must never look like "0%
 * spent, on track". */
export function BudgetProgressBar({ spent, amount, pct, isOverBudget, currency, hasCategories }: Props) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const posColor = dark ? '#22C55E' : '#16A34A';
  const warningColor = dark ? '#F3B25E' : '#B45309';
  const dangerColor = dark ? '#F16A6E' : '#E5484D';
  const barColor = isOverBudget ? dangerColor : pct >= 80 ? warningColor : posColor;

  if (!hasCategories) {
    return (
      <View className="flex-row items-center gap-2 rounded-xl bg-warning-tint px-3.5 py-3 dark:bg-warning-tint-dark">
        <Ionicons name="alert-circle" size={16} color={warningColor} />
        <Text className="flex-1 text-[13px] font-medium leading-[17px] text-warning dark:text-warning-dark">
          Sin categorías asignadas — este presupuesto no está contando ningún gasto.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-ink dark:text-ink-dark">
          {formatCurrency(spent, currency)}{' '}
          <Text className="text-ink-3 dark:text-ink-3-dark">de {formatCurrency(amount, currency)}</Text>
        </Text>
        <Text className="text-sm font-semibold" style={{ color: barColor }}>
          {Math.round(pct)}%
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-line dark:bg-line-dark">
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
        />
      </View>
    </View>
  );
}
