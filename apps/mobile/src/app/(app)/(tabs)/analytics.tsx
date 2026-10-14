import { useAccounts, useDailyTotals, useProfile, useTransactions } from '@repo/core/hooks';
import {
  categoryTrend,
  dailyTransactionTotals,
  formatMonthShort,
  longestNoSpendStreak,
  monthlyTransactionTotalsForYear,
  noSpendStreak,
  periodInsights,
  periodLabel,
  periodRange,
  previousPeriodRange,
  shiftPeriodDate,
  todayISODate,
  topTransactions,
  type AnalyticsPeriod,
} from '@repo/core/utils';
import {
  Chip,
  Screen,
  SegmentedControl,
  type SegmentedOption,
  ICON_COLORS,
  useTabBarScrollPadding,
} from '@repo/ui';
import { useRouter } from 'expo-router';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AnalyticsSkeleton } from '../../../features/analytics/analytics-skeleton';
import { BiggestExpensesCard } from '../../../features/analytics/biggest-expenses-card';
import { BudgetsProgressCard } from '../../../features/analytics/budgets-progress-card';
import {
  CalendarHeatmap,
  type HeatmapCell,
  type HeatmapVariant,
} from '../../../features/analytics/calendar-heatmap';
import { CategoryTrendCard } from '../../../features/analytics/category-trend-card';
import { DayDetailCard } from '../../../features/analytics/day-detail-card';
import { InsightsStrip } from '../../../features/analytics/insights-strip';
import { MonthPickerSheet } from '../../../features/home/month-picker-sheet';
import { MonthlyTrendChart } from '../../../features/home/monthly-trend-chart';

const WEEKDAY_HEADER = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const PERIOD_OPTIONS: SegmentedOption<AnalyticsPeriod>[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
];

type ViewMode = 'calendar' | 'trend';

const VIEW_OPTIONS: SegmentedOption<ViewMode>[] = [
  { value: 'calendar', label: 'Calendario', icon: Calendar },
  { value: 'trend', label: 'Tendencia', icon: TrendingUp },
];

const METRIC_OPTIONS: SegmentedOption<HeatmapVariant>[] = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
];

export default function AnalyticsScreen() {
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const { data: profile } = useProfile();
  const defaultCurrency = profile?.currency ?? accounts?.[0]?.currency ?? 'MXN';

  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapVariant>('expense');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const range = useMemo(() => periodRange(period, referenceDate), [period, referenceDate]);

  // Only the movements this screen actually shows: the period on screen and
  // the one before it (what every "vs. anterior" compares against) — not the
  // whole history. Paging to another period keeps the current one on
  // screen while the next loads.
  const rangeFilters = useMemo(
    () => ({ from: previousPeriodRange(period, referenceDate).from, to: range.to }),
    [period, referenceDate, range],
  );
  const { data: transactions, isLoading } = useTransactions(rangeFilters, { keepPrevious: true });
  // The no-spend streaks are the one thing that needs the whole history —
  // but only which days had spending: per-day totals summed by Postgres.
  const { data: dailyTotals, isLoading: loadingDays } = useDailyTotals();

  // All analytics below are scoped to one currency at a time — there's no
  // exchange rate in this app to blend them correctly. `selectedCurrency`
  // stays `null` ("use whichever is first") until the user actually taps a
  // chip, so it tracks the data instead of freezing a possibly-stale choice.
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const currencies = useMemo(() => {
    const set = new Set((dailyTotals ?? []).map((d) => d.currency));
    return [...set].sort();
  }, [dailyTotals]);
  const currency =
    selectedCurrency && currencies.includes(selectedCurrency)
      ? selectedCurrency
      : (currencies[0] ?? defaultCurrency);
  const tx = useMemo(
    () => (transactions ?? []).filter((t) => (t.account?.currency ?? defaultCurrency) === currency),
    [transactions, currency, defaultCurrency],
  );
  // The history as one synthetic row per day and type — exactly what the
  // streak functions read (settled expense days, and the earliest active day).
  const history = useMemo(
    () =>
      (dailyTotals ?? [])
        .filter((d) => d.currency === currency)
        .map((d) => ({
          type: d.type,
          amount: d.total,
          transaction_date: d.date,
          is_completed: true,
        })),
    [dailyTotals, currency],
  );

  const insights = useMemo(() => {
    const today = todayISODate();
    return {
      ...periodInsights(tx, period, referenceDate, heatmapMetric, today),
      noSpendStreakDays: noSpendStreak(history, today),
      bestNoSpendStreakDays: longestNoSpendStreak(history, today),
    };
  }, [tx, history, period, referenceDate, heatmapMetric]);
  const trend = useMemo(
    () => categoryTrend(tx, period, referenceDate, heatmapMetric),
    [tx, period, referenceDate, heatmapMetric],
  );
  const biggest = useMemo(
    () => topTransactions(tx, range.from, range.to, heatmapMetric, 3),
    [tx, range, heatmapMetric],
  );

  const heatmapCells = useMemo<HeatmapCell[]>(() => {
    if (period === 'year') {
      return monthlyTransactionTotalsForYear(tx, referenceDate.getFullYear(), heatmapMetric).map(
        (m) => ({
          key: m.month,
          label: formatMonthShort(m.month).replace(/\s.*$/, ''),
          total: m.total,
        }),
      );
    }

    const days = dailyTransactionTotals(tx, range.from, range.to, heatmapMetric).map((d) => ({
      key: d.date,
      label: String(Number(d.date.slice(8, 10))),
      total: d.total,
    }));
    if (period !== 'month') return days;

    const [y, m] = range.from.split('-').map(Number);
    const firstWeekday = (new Date(y!, (m ?? 1) - 1, 1).getDay() + 6) % 7; // Monday-start offset
    const leading: HeatmapCell[] = Array.from({ length: firstWeekday }, (_, i) => ({
      key: `blank-lead-${i}`,
      label: '',
      total: 0,
      blank: true,
    }));
    const trailingCount = (7 - ((leading.length + days.length) % 7)) % 7;
    const trailing: HeatmapCell[] = Array.from({ length: trailingCount }, (_, i) => ({
      key: `blank-trail-${i}`,
      label: '',
      total: 0,
      blank: true,
    }));
    return [...leading, ...days, ...trailing];
  }, [tx, period, range, referenceDate, heatmapMetric]);

  const columns = period === 'year' ? 4 : 7;

  const openTransaction = (id: string) =>
    router.push({ pathname: '/(app)/transactions/[id]', params: { id } });

  const openExpenses = () =>
    router.push({
      pathname: '/(app)/transactions',
      params: { type: heatmapMetric, from: range.from, to: range.to },
    });

  // "Gastos por categoría" only breaks down expenses — there's no income
  // equivalent screen yet, so the link is hidden while viewing income.
  const openMonthCategories =
    period === 'month' && heatmapMetric === 'expense'
      ? () =>
          router.push({
            pathname: '/(app)/monthly-spending',
            params: { month: range.from.slice(0, 7), label: periodLabel('month', referenceDate) },
          })
      : undefined;

  const handleSelectCell = (key: string) => {
    if (period === 'year') {
      const [y, m] = key.split('-').map(Number);
      setPeriod('month');
      setReferenceDate(new Date(y!, (m ?? 1) - 1, 1));
      setSelectedDate(null);
      return;
    }
    setSelectedDate((prev) => (prev === key ? null : key));
  };

  const shift = (delta: number) => {
    setReferenceDate((d) => shiftPeriodDate(period, d, delta));
    setSelectedDate(null);
  };

  return (
    <Screen edges={['top']} className="gap-5">
      <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Análisis</Text>

      <SegmentedControl
        options={PERIOD_OPTIONS}
        value={period}
        onChange={(next) => {
          setPeriod(next);
          setReferenceDate(new Date());
          setSelectedDate(null);
        }}
      />

      {currencies.length > 1 ? (
        <View className="flex-row flex-wrap gap-2">
          {currencies.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={currency === c}
              onPress={() => {
                setSelectedCurrency(c);
                setSelectedDate(null);
              }}
            />
          ))}
        </View>
      ) : null}

      <View className="flex-row items-center justify-center gap-4">
        <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="Periodo anterior">
          <ChevronLeft size={22} color={ICON_COLORS.ink3} />
        </Pressable>
        {period === 'month' ? (
          <Pressable
            onPress={() => setMonthPickerOpen(true)}
            hitSlop={8}
            className="min-w-[140px] flex-row items-center justify-center gap-1 active:opacity-60"
          >
            <Text className="text-center text-base font-bold text-ink dark:text-ink-dark">
              {periodLabel(period, referenceDate)}
            </Text>
            <ChevronDown size={16} color={ICON_COLORS.ink3} />
          </Pressable>
        ) : (
          <Text className="min-w-[140px] text-center text-base font-bold text-ink dark:text-ink-dark">
            {periodLabel(period, referenceDate)}
          </Text>
        )}
        <Pressable
          onPress={() => shift(1)}
          hitSlop={10}
          disabled={insights.isCurrentPeriod}
          accessibilityLabel="Periodo siguiente"
        >
          <ChevronRight size={22} color={insights.isCurrentPeriod ? '#D1D5DB' : ICON_COLORS.ink3} />
        </Pressable>
      </View>

      {period === 'month' ? (
        <MonthPickerSheet
          visible={monthPickerOpen}
          onClose={() => setMonthPickerOpen(false)}
          year={referenceDate.getFullYear()}
          month={referenceDate.getMonth()}
          maxDate={new Date()}
          onSelect={(y, m) => {
            setReferenceDate(new Date(y, m, 1));
            setSelectedDate(null);
          }}
        />
      ) : null}

      {isLoading || loadingDays ? (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollPadding }}
        >
          <AnalyticsSkeleton />
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollPadding }}
        >
          <SegmentedControl options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />

          {viewMode === 'calendar' ? (
            <View className="rounded-card bg-surface p-5 dark:bg-surface-dark">
              <View className="mb-4 flex-row justify-end gap-2">
                {METRIC_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    selected={heatmapMetric === opt.value}
                    dotColor={opt.value === 'income' ? ICON_COLORS.pos : ICON_COLORS.danger}
                    onPress={() => setHeatmapMetric(opt.value)}
                  />
                ))}
              </View>
              <CalendarHeatmap
                cells={heatmapCells}
                columns={columns}
                weekdayHeader={period === 'year' ? undefined : WEEKDAY_HEADER}
                selectedKey={selectedDate}
                onSelect={handleSelectCell}
                variant={heatmapMetric}
                showAmounts
              />
            </View>
          ) : (
            <MonthlyTrendChart months={period === 'year' ? 12 : 6} referenceDate={referenceDate} />
          )}

          {viewMode === 'calendar' && period !== 'year' && selectedDate ? (
            <DayDetailCard
              dateISO={selectedDate}
              transactions={tx}
              history={history}
              currency={currency}
              onPressTransaction={openTransaction}
            />
          ) : null}

          <InsightsStrip insights={insights} currency={currency} metric={heatmapMetric} />

          {period === 'month' ? <BudgetsProgressCard currency={currency} /> : null}

          <CategoryTrendCard trend={trend} onSeeAll={openMonthCategories} metric={heatmapMetric} />

          <BiggestExpensesCard
            expenses={biggest}
            currency={currency}
            onSeeAll={openExpenses}
            onPressTransaction={openTransaction}
            metric={heatmapMetric}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
