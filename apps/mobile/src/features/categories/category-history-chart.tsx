import { useTransactions } from '@repo/core/hooks';
import { categoryMonthlyHistory, formatCurrency, formatMonthShort } from '@repo/core/utils';
import { SegmentedControl } from '@repo/ui';
import { useMemo, useState } from 'react';
import { Text, View, useColorScheme, useWindowDimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';

const MONTHS = 6;
const CARD_PADDING = 16; // matches p-4
const SCREEN_PADDING = 20; // matches Screen's px-5
const Y_AXIS_GUTTER = 40; // room gifted-charts reserves for the y-axis labels

interface Props {
  categoryId: string;
  color: string | null;
  currency: string;
}

/** A category's monthly spend history, switchable between bar and line. */
export function CategoryHistoryChart({ categoryId, color, currency }: Props) {
  const dark = useColorScheme() === 'dark';
  const { width: windowWidth } = useWindowDimensions();
  const { data: transactions } = useTransactions();
  const [kind, setKind] = useState<'bar' | 'line'>('bar');

  const history = useMemo(
    () => categoryMonthlyHistory(transactions ?? [], categoryId, MONTHS),
    [transactions, categoryId],
  );

  const total = history.reduce((sum, h) => sum + h.total, 0);
  const hasData = total > 0;
  const accent = color ?? '#4D7C0F';
  const axisColor = dark ? '#6B7178' : '#9CA3AF';
  const gridColor = dark ? '#23272C' : '#EDEFF2';

  const points = history.map((h) => ({ value: h.total, label: formatMonthShort(h.month) }));
  const chartWidth = Math.max(
    windowWidth - SCREEN_PADDING * 2 - CARD_PADDING * 2 - Y_AXIS_GUTTER,
    160,
  );

  const shared = {
    width: chartWidth,
    height: 160,
    initialSpacing: 10,
    endSpacing: 6,
    yAxisThickness: 0,
    xAxisThickness: 1,
    xAxisColor: gridColor,
    rulesColor: gridColor,
    rulesType: 'solid' as const,
    noOfSections: 3,
    yAxisTextStyle: { color: axisColor, fontSize: 10 },
    xAxisLabelTextStyle: { color: axisColor, fontSize: 10 },
    isAnimated: true,
  };

  return (
    <View className="gap-3 rounded-2xl border border-line bg-surface p-4 dark:border-line-dark dark:bg-surface-dark">
      <View>
        <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">
          Historial · últimos {MONTHS} meses
        </Text>
        <Text className="mt-0.5 text-lg font-bold text-ink dark:text-ink-dark">
          {formatCurrency(total, currency)}
        </Text>
      </View>

      <SegmentedControl
        options={[
          { value: 'bar', label: 'Barras', icon: 'bar-chart-outline' },
          { value: 'line', label: 'Línea', icon: 'analytics-outline' },
        ]}
        value={kind}
        onChange={setKind}
      />

      {hasData ? (
        kind === 'bar' ? (
          <BarChart
            data={points}
            barWidth={Math.max(chartWidth / (MONTHS * 2.2), 14)}
            spacing={chartWidth / MONTHS / 2}
            barBorderRadius={4}
            frontColor={accent}
            {...shared}
          />
        ) : (
          <LineChart
            data={points}
            color={accent}
            thickness={2.5}
            curved
            areaChart
            startFillColor={accent}
            endFillColor={accent}
            startOpacity={0.22}
            endOpacity={0.02}
            dataPointsColor={accent}
            dataPointsRadius={3}
            {...shared}
          />
        )
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
