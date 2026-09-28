import { useTransactions } from '@repo/core/hooks';
import { formatMonthShort, monthlyIncomeExpenseHistory } from '@repo/core/utils';
import { useMemo } from 'react';
import { Text, View, useColorScheme, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const MONTHS = 6;
const CARD_PADDING = 20; // matches p-5
const SCREEN_PADDING = 20; // matches Screen's px-5
const Y_AXIS_GUTTER = 40; // room gifted-charts reserves for the y-axis labels

/** Whole-account income vs. expense trend over the last `MONTHS` months — the
 * general-purpose counterpart to `CategoryHistoryChart`, which is scoped to
 * one category. */
export function MonthlyTrendChart() {
  const dark = useColorScheme() === 'dark';
  const { width: windowWidth } = useWindowDimensions();
  const { data: transactions } = useTransactions();

  const history = useMemo(
    () => monthlyIncomeExpenseHistory(transactions ?? [], MONTHS),
    [transactions],
  );
  const hasData = history.some((h) => h.income > 0 || h.expense > 0);

  const axisColor = dark ? '#6B7178' : '#9CA3AF';
  const gridColor = dark ? '#23272C' : '#EDEFF2';
  const incomeColor = dark ? '#22C55E' : '#16A34A';
  const expenseColor = dark ? '#F16A6E' : '#E5484D';

  const incomePoints = history.map((h) => ({ value: h.income, label: formatMonthShort(h.month) }));
  const expensePoints = history.map((h) => ({ value: h.expense }));
  const chartWidth = Math.max(
    windowWidth - SCREEN_PADDING * 2 - CARD_PADDING * 2 - Y_AXIS_GUTTER,
    160,
  );

  return (
    <View className="gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
          Tendencia mensual
        </Text>
        <View className="flex-row items-center gap-3">
          <Legend color={incomeColor} label="Ingresos" />
          <Legend color={expenseColor} label="Gastos" />
        </View>
      </View>

      {hasData ? (
        <LineChart
          data={incomePoints}
          data2={expensePoints}
          color1={incomeColor}
          color2={expenseColor}
          thickness1={2.5}
          thickness2={2.5}
          curved
          dataPointsColor1={incomeColor}
          dataPointsColor2={expenseColor}
          dataPointsRadius={3}
          width={chartWidth}
          height={160}
          initialSpacing={10}
          endSpacing={6}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={gridColor}
          rulesColor={gridColor}
          rulesType="solid"
          noOfSections={3}
          yAxisTextStyle={{ color: axisColor, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: axisColor, fontSize: 10 }}
          isAnimated
        />
      ) : (
        <View className="items-center justify-center py-10">
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
            Sin movimientos en los últimos {MONTHS} meses.
          </Text>
        </View>
      )}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs text-ink-2 dark:text-ink-2-dark">{label}</Text>
    </View>
  );
}
