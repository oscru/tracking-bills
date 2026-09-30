import { formatCurrency } from '@repo/core/utils';
import { useColorScheme } from 'nativewind';
import { Text, View } from 'react-native';

interface Props {
  spent: number;
  amount: number;
  pct: number;
  isOverBudget: boolean;
  currency: string;
}

/** A thin progress bar for one budget's current-period status — green under
 * budget, amber close to the limit, red over it. */
export function BudgetProgressBar({ spent, amount, pct, isOverBudget, currency }: Props) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const posColor = dark ? '#22C55E' : '#16A34A';
  const warningColor = dark ? '#F3B25E' : '#B45309';
  const dangerColor = dark ? '#F16A6E' : '#E5484D';
  const barColor = isOverBudget ? dangerColor : pct >= 80 ? warningColor : posColor;

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
