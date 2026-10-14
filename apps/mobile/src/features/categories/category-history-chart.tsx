import { useTransactions } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { Category } from '@repo/core/types';
import {
  categoryRangeComparison,
  categorySpendSeries,
  formatCurrency,
  formatDate,
  groupByAccountCurrency,
  type CategoryHistoryRange,
  type SpendSeries,
} from '@repo/core/utils';
import { Chip, SegmentedControl, ICON_COLORS, type SegmentedOption } from '@repo/ui';
import { ChartColumn, ChartLine } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { LinearGradient, Stop } from 'react-native-svg';

import { TrendBadge } from '../analytics/category-trend-card';
import { mixColor } from '../design/color';

const CARD_PADDING = 16; // matches p-4
const SCREEN_PADDING = 20; // matches Screen's px-5
const Y_AXIS_GUTTER = 40; // room gifted-charts reserves for the y-axis labels
// The bar/line switch keeps a fixed width so it never pushes past the card
// edge next to the title (it stretched to fill the row before).
const SWITCH_WIDTH = 196;
// gifted-charts animates bars on the JS thread — fine for a handful, janky
// for 30 daily bars.
const MAX_ANIMATED_BARS = 12;

const RANGE_OPTIONS: SegmentedOption<CategoryHistoryRange>[] = [
  { value: 'all', label: 'Todo' },
  { value: 'year', label: '1 año' },
  { value: 'half', label: '6 meses' },
  { value: 'month', label: '1 mes' },
];

const PERIOD_LABEL: Record<Exclude<CategoryHistoryRange, 'all'>, string> = {
  year: 'los 12 meses anteriores',
  half: 'los 6 meses anteriores',
  month: 'los 30 días anteriores',
};

const UNIT_LABEL: Record<SpendSeries['granularity'], string> = {
  day: 'día',
  month: 'mes',
  year: 'año',
};

/** Which categories the charts sum: the parent rolls up its subcategories. */
type Selection = { kind: 'all' } | { kind: 'one'; category: Category };

interface Props {
  category: Category;
  /** Its subcategories (empty for a subcategory or a category without any). */
  subcategories: Category[];
}

/**
 * A category's spend over time — range switch (todo / 1 año / 6 meses /
 * 1 mes), bar or line chart, a subcategory filter, and a trend card
 * comparing the range with the period right before it. A parent's totals
 * include its subcategories. One chart per currency, never blended.
 */
export function CategoryHistoryChart({ category, subcategories }: Props) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const { width: windowWidth } = useWindowDimensions();
  const { data: transactions } = useTransactions();
  const [kind, setKind] = useState<'bar' | 'line'>('bar');
  const [range, setRange] = useState<CategoryHistoryRange>('half');
  const [selection, setSelection] = useState<Selection>({ kind: 'all' });

  const activeSubs = useMemo(() => subcategories.filter((s) => !s.archived), [subcategories]);
  const selectedIds = useMemo(
    () =>
      selection.kind === 'one'
        ? [selection.category.id]
        : [category.id, ...subcategories.map((s) => s.id)],
    [selection, category.id, subcategories],
  );
  const focus = selection.kind === 'one' ? selection.category : category;
  const metric: 'expense' | 'income' = category.type === 'income' ? 'income' : 'expense';

  const groups = useMemo(() => {
    return groupByAccountCurrency(transactions ?? [])
      .map((g) => {
        const series = categorySpendSeries(g.transactions, selectedIds, range);
        return {
          currency: g.currency,
          transactions: g.transactions,
          series,
          total: series.points.reduce((sum, p) => sum + p.total, 0),
        };
      })
      .filter((g) => g.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [transactions, selectedIds, range]);
  const hasAnyData = groups.length > 0;

  const accent = focus.color ?? category.color ?? ICON_COLORS.limeInk;
  const axisColor = dark ? ICON_COLORS.ink3Dark : ICON_COLORS.ink3;
  const gridColor = dark ? ICON_COLORS.lineDark : ICON_COLORS.line;
  const chartWidth = Math.max(
    windowWidth - SCREEN_PADDING * 2 - CARD_PADDING * 2 - Y_AXIS_GUTTER,
    160,
  );

  return (
    <View className="gap-4">
      <View className="gap-4 rounded-2xl border border-line bg-surface p-4 dark:border-line-dark dark:bg-surface-dark">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 pr-2 text-xs font-semibold text-ink-2 dark:text-ink-2-dark">
            Historial
          </Text>
          <View style={{ width: SWITCH_WIDTH }}>
            <SegmentedControl
              options={[
                { value: 'bar', label: 'Barras', icon: ChartColumn },
                { value: 'line', label: 'Línea', icon: ChartLine },
              ]}
              value={kind}
              onChange={setKind}
            />
          </View>
        </View>

        <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />

        {activeSubs.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            <Chip
              label="Todas"
              selected={selection.kind === 'all'}
              onPress={() => setSelection({ kind: 'all' })}
            />
            {activeSubs.map((s) => (
              <Chip
                key={s.id}
                label={resolveCategoryLabel(s)}
                icon={s.icon}
                dotColor={s.color ?? category.color}
                selected={selection.kind === 'one' && selection.category.id === s.id}
                onPress={() => setSelection({ kind: 'one', category: s })}
              />
            ))}
          </ScrollView>
        ) : null}

        {hasAnyData ? (
          groups.map(({ currency, series, total }) => {
            const n = series.points.length;
            const slot = chartWidth / Math.max(n, 1);
            const barWidth = Math.max(Math.min(slot * 0.62, 28), 3);
            const points = series.points.map((p) => ({ value: p.total, label: p.label }));
            const gradientId = `categoryBars-${currency}`;
            const shared = {
              width: chartWidth,
              height: 160,
              initialSpacing: Math.min(10, slot / 2),
              endSpacing: 6,
              yAxisThickness: 0,
              xAxisThickness: 1,
              xAxisColor: gridColor,
              rulesColor: gridColor,
              rulesType: 'solid' as const,
              noOfSections: 3,
              yAxisTextStyle: { color: axisColor, fontSize: 10 },
              xAxisLabelTextStyle: { color: axisColor, fontSize: 10 },
            };
            return (
              <View key={currency} className="gap-2">
                <View>
                  {groups.length > 1 ? (
                    <Text className="text-xs font-semibold text-ink-3 dark:text-ink-3-dark">
                      {currency}
                    </Text>
                  ) : null}
                  <Text className="mt-0.5 text-lg font-bold text-ink dark:text-ink-dark">
                    {formatCurrency(total, currency)}
                  </Text>
                </View>

                {kind === 'bar' ? (
                  <BarChart
                    data={points}
                    barWidth={barWidth}
                    spacing={Math.max(slot - barWidth, 2)}
                    barBorderRadius={Math.min(6, barWidth / 2)}
                    frontColor={accent}
                    // Vertical gradient per bar — light top, full color at the
                    // base. An SVG pattern (react-native-svg), not the
                    // library's `showGradient`, which needs a native module.
                    barBackgroundPattern={() => (
                      <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={mixColor(accent, 'light', 0.55)} />
                        <Stop offset="1" stopColor={mixColor(accent, 'dark', 0.08)} />
                      </LinearGradient>
                    )}
                    patternId={gradientId}
                    isAnimated={n <= MAX_ANIMATED_BARS}
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
                    dataPointsRadius={n > 12 ? 0 : 3}
                    spacing={n > 1 ? (chartWidth - 16) / (n - 1) : chartWidth}
                    {...shared}
                  />
                )}
              </View>
            );
          })
        ) : (
          <View className="items-center justify-center py-10">
            <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
              Sin movimientos en este periodo.
            </Text>
          </View>
        )}
      </View>

      {hasAnyData ? (
        <TrendCard
          group={groups[0]!}
          showCurrency={groups.length > 1}
          selectedIds={selectedIds}
          range={range}
          metric={metric}
          category={category}
          subcategories={selection.kind === 'all' ? activeSubs : []}
        />
      ) : null}
    </View>
  );
}

/**
 * "Tendencia": the range vs. the period right before it, average and peak
 * per bucket, and — with "Todas" selected on a parent — how each
 * subcategory moved, the same ▲/▼ reading as Análisis.
 */
function TrendCard({
  group,
  showCurrency,
  selectedIds,
  range,
  metric,
  category,
  subcategories,
}: {
  group: {
    currency: string;
    transactions: Parameters<typeof categorySpendSeries>[0];
    series: SpendSeries;
    total: number;
  };
  showCurrency: boolean;
  /** The categories the charts are summing (the current selection). */
  selectedIds: readonly string[];
  range: CategoryHistoryRange;
  metric: 'expense' | 'income';
  category: Category;
  subcategories: Category[];
}) {
  const { currency, transactions, series, total } = group;
  const money = (n: number) => formatCurrency(n, currency);
  const comparison =
    range === 'all' ? null : categoryRangeComparison(transactions, selectedIds, range);

  const average = series.points.length ? total / series.points.length : 0;
  const peak = series.points.reduce(
    (best, p) => (p.total > best.total ? p : best),
    series.points[0] ?? { key: '', label: '', total: 0 },
  );
  const peakLabel =
    series.granularity === 'day' ? formatDate(peak.key).replace(/\s\d{4}$/, '') : peak.label;

  // With "Todas": the parent's own spend plus each subcategory, compared too.
  const rows =
    subcategories.length > 0
      ? [category, ...subcategories]
          .map((c) => {
            const ids = [c.id];
            const current =
              range === 'all'
                ? categorySpendSeries(transactions, ids, 'all').points.reduce(
                    (s, p) => s + p.total,
                    0,
                  )
                : categoryRangeComparison(transactions, ids, range).current;
            const pct =
              range === 'all' ? null : categoryRangeComparison(transactions, ids, range).pctChange;
            return { c, current, pct, isParent: c.id === category.id };
          })
          .filter((r) => r.current > 0 || r.pct != null)
          .sort((a, b) => b.current - a.current)
      : [];

  return (
    <View className="gap-4 rounded-2xl border border-line bg-surface p-4 dark:border-line-dark dark:bg-surface-dark">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">Tendencia</Text>
        {showCurrency ? (
          <Text className="text-xs font-semibold text-ink-3 dark:text-ink-3-dark">{currency}</Text>
        ) : null}
      </View>

      {comparison ? (
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
              vs. {PERIOD_LABEL[range as Exclude<CategoryHistoryRange, 'all'>]}
            </Text>
            <Text className="text-sm text-ink-3 dark:text-ink-3-dark">
              {money(comparison.previous)} → {money(comparison.current)}
            </Text>
          </View>
          <TrendBadge pct={comparison.pctChange} metric={metric} />
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <View className="flex-1 rounded-xl bg-canvas p-3 dark:bg-canvas-dark">
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            Promedio por {UNIT_LABEL[series.granularity]}
          </Text>
          <Text className="mt-0.5 text-base font-bold text-ink dark:text-ink-dark">
            {money(average)}
          </Text>
        </View>
        <View className="flex-1 rounded-xl bg-canvas p-3 dark:bg-canvas-dark">
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark" numberOfLines={1}>
            Más alto · {peakLabel}
          </Text>
          <Text className="mt-0.5 text-base font-bold text-ink dark:text-ink-dark">
            {money(peak.total)}
          </Text>
        </View>
      </View>

      {rows.length > 0 ? (
        <View className="gap-3 border-t border-line pt-4 dark:border-line-dark">
          <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">
            Por subcategoría
          </Text>
          {rows.map(({ c, current, pct, isParent }) => (
            <View key={c.id} className="flex-row items-center gap-3">
              <View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: c.color ?? category.color ?? ICON_COLORS.ink3 }}
              />
              <Text className="flex-1 text-sm text-ink dark:text-ink-dark" numberOfLines={1}>
                {isParent ? `Solo ${resolveCategoryLabel(c)}` : resolveCategoryLabel(c)}
              </Text>
              <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                {money(current)}
              </Text>
              {range === 'all' ? null : (
                <View style={{ minWidth: 58, alignItems: 'flex-end' }}>
                  <TrendBadge pct={pct} metric={metric} />
                </View>
              )}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
