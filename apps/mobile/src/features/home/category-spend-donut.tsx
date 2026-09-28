import type { CategorySpend } from '@repo/core/utils';
import { formatCurrency } from '@repo/core/utils';
import { Text, View, useColorScheme } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

interface Props {
  breakdown: CategorySpend[];
  total: number;
  currency: string;
  radius?: number;
}

/** Donut of the month's spend, one slice per category in that category's own color. */
export function CategorySpendDonut({ breakdown, total, currency, radius = 72 }: Props) {
  const dark = useColorScheme() === 'dark';

  return (
    <PieChart
      data={breakdown.map((c) => ({ value: c.total, color: c.color }))}
      donut
      radius={radius}
      innerRadius={radius * 0.62}
      innerCircleColor={dark ? '#16191D' : '#FFFFFF'}
      centerLabelComponent={() => (
        <View className="items-center">
          <Text className="text-[11px] text-ink-2 dark:text-ink-2-dark">Total</Text>
          <Text className="text-base font-bold text-ink dark:text-ink-dark">
            {formatCurrency(total, currency)}
          </Text>
        </View>
      )}
    />
  );
}
