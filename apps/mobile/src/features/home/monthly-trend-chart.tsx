import { useMonthlyCategoryTotals } from '@repo/core/hooks';
import { formatCompactAmount, formatMonthShort, monthlyHistoryFromSummary } from '@repo/core/utils';
import { useColorScheme } from 'nativewind';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { ICON_COLORS } from '@repo/ui';

const DEFAULT_MONTHS = 6;
const Y_AXIS_GUTTER = 44; // room for the (compact, "$12k") y-axis labels
const INITIAL_SPACING = 10;
const END_SPACING = 10;
// `fill`: room the x-axis labels and a currency caption take under/over a chart.
const X_LABELS_HEIGHT = 28;
const CAPTION_HEIGHT = 22;
const GROUP_GAP = 20;
const FILL_MIN_CHART_HEIGHT = 80;

/**
 * The y-axis top: the higher of BOTH series (gifted-charts scales from the
 * first one only — with more spent than earned, the expense line shot out
 * of the chart), rounded up so each section is a round step (1, 2, 2.5 or
 * 5 × 10ⁿ).
 */
function niceMax(peak: number, sections: number): number {
  if (peak <= 0) return sections;
  const raw = peak / sections;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw)! * magnitude;
  return step * sections;
}

/**
 * Whole-account income vs. expense trend over the last `months` months — the
 * general-purpose counterpart to `CategoryHistoryChart`, which is scoped to
 * one category. One chart per currency present, never blended together.
 */
export function MonthlyTrendChart({
  months = DEFAULT_MONTHS,
  referenceDate,
  fill = false,
}: {
  months?: number;
  /**
   * Fill the parent (a Home grid cell): the chart takes the card's real
   * width and height instead of a fixed 160px and the window's width.
   */
  fill?: boolean;
  /** The `months`-month window ends here instead of today — e.g. Análisis
   * passes its own navigated period so "Tendencia" actually moves when you
   * page back a year, instead of always showing the months ending today. */
  referenceDate?: Date;
}) {
  const { t } = useTranslation(['home', 'common']);
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  // Pre-summed per month by Postgres — no need for the full history here.
  const { data: summary } = useMonthlyCategoryTotals();

  const groups = useMemo(
    () => monthlyHistoryFromSummary(summary ?? [], months, referenceDate),
    [summary, months, referenceDate],
  );
  const hasAnyData = groups.some((g) => g.history.some((h) => h.income > 0 || h.expense > 0));

  const axisColor = dark ? ICON_COLORS.ink3Dark : ICON_COLORS.ink3;
  const gridColor = dark ? ICON_COLORS.lineDark : ICON_COLORS.line;
  const incomeColor = dark ? ICON_COLORS.posDark : ICON_COLORS.pos;
  const expenseColor = dark ? ICON_COLORS.dangerDark : ICON_COLORS.danger;
  // Measured from the card's body — not the window, which on desktop (with
  // a sidebar and side columns) made the chart overflow its card.
  const [body, setBody] = useState({ width: 0, height: 0 });
  const chartWidth = Math.max(body.width - Y_AXIS_GUTTER, 160);
  const shownGroups = groups.filter((g) =>
    g.history.some((h) => h.income > 0 || h.expense > 0),
  ).length;
  const chartHeight = fill
    ? Math.max(
        FILL_MIN_CHART_HEIGHT,
        (body.height - GROUP_GAP * (shownGroups - 1)) / Math.max(1, shownGroups) -
          X_LABELS_HEIGHT -
          (shownGroups > 1 ? CAPTION_HEIGHT : 0),
      )
    : 160;
  // Spread the months across the whole width (gifted-charts' default
  // spacing left the line ending halfway on a wide card).
  const spacing = (chartWidth - INITIAL_SPACING - END_SPACING) / Math.max(1, months - 1);

  return (
    <View
      className={`gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark ${fill ? 'flex-1' : ''}`}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
          {t('monthlyTrend.title')}
        </Text>
        <View className="flex-row items-center gap-3">
          <Legend color={incomeColor} label={t('common:income')} />
          <Legend color={expenseColor} label={t('common:expenses')} />
        </View>
      </View>

      {hasAnyData && body.width === 0 ? (
        // Measure first, then draw at the real size.
        <View
          className={fill ? 'flex-1' : undefined}
          style={fill ? undefined : { height: 160 + X_LABELS_HEIGHT }}
          onLayout={(e) => setBody(e.nativeEvent.layout)}
        />
      ) : hasAnyData ? (
        <View
          className={fill ? 'flex-1 gap-5' : 'gap-5'}
          onLayout={(e) => setBody(e.nativeEvent.layout)}
        >
          {groups.map(({ currency, history }) => {
            const hasData = history.some((h) => h.income > 0 || h.expense > 0);
            if (!hasData) return null;
            const incomePoints = history.map((h) => ({
              value: h.income,
              label: formatMonthShort(h.month),
            }));
            const expensePoints = history.map((h) => ({ value: h.expense }));
            const sections = chartHeight >= 220 ? 4 : 3;
            const maxValue = niceMax(
              Math.max(...history.map((h) => Math.max(h.income, h.expense))),
              sections,
            );
            return (
              <View key={currency} className="gap-2">
                {groups.length > 1 ? (
                  <Text className="text-xs font-semibold text-ink-3 dark:text-ink-3-dark">
                    {currency}
                  </Text>
                ) : null}
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
                  height={chartHeight}
                  spacing={spacing}
                  initialSpacing={INITIAL_SPACING}
                  endSpacing={END_SPACING}
                  yAxisLabelWidth={Y_AXIS_GUTTER}
                  formatYLabel={(label) => formatCompactAmount(Number(label))}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={gridColor}
                  rulesColor={gridColor}
                  rulesType="solid"
                  noOfSections={sections}
                  maxValue={maxValue}
                  yAxisTextStyle={{ color: axisColor, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: axisColor, fontSize: 10 }}
                  // No `isAnimated`: gifted-charts draws that in with five
                  // staggered JS-thread width animations (`useNativeDriver:
                  // false`, ~3s of per-frame JS work) right as Inicio mounts,
                  // competing with everything else. The card already fades in
                  // via `StaggerItem` on the UI thread.
                />
              </View>
            );
          })}
        </View>
      ) : (
        <View className="items-center justify-center py-10">
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
            {t('monthlyTrend.empty', { months })}
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
