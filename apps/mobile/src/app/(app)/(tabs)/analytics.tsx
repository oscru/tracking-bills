import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useTransactions } from '@repo/core/hooks';
import {
  categoryTrend,
  dailyTransactionTotals,
  formatMonthShort,
  monthlyTransactionTotalsForYear,
  periodInsights,
  periodLabel,
  periodRange,
  shiftPeriodDate,
  topTransactions,
  type AnalyticsPeriod,
} from '@repo/core/utils';
import { Chip, Screen, SegmentedControl, type SegmentedOption } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { BiggestExpensesCard } from '../../../features/analytics/biggest-expenses-card';
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
  { value: 'calendar', label: 'Calendario', icon: 'calendar-outline' },
  { value: 'trend', label: 'Tendencia', icon: 'trending-up-outline' },
];

const METRIC_OPTIONS: SegmentedOption<HeatmapVariant>[] = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
];

export default function AnalyticsScreen() {
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const { data: transactions, isLoading } = useTransactions();
  const currency = accounts?.[0]?.currency ?? 'MXN';
  const tx = useMemo(() => transactions ?? [], [transactions]);

  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapVariant>('expense');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const range = useMemo(() => periodRange(period, referenceDate), [period, referenceDate]);
  const insights = useMemo(
    () => periodInsights(tx, period, referenceDate, heatmapMetric),
    [tx, period, referenceDate, heatmapMetric],
  );
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
      return monthlyTransactionTotalsForYear(tx, referenceDate.getFullYear(), heatmapMetric).map((m) => ({
        key: m.month,
        label: formatMonthShort(m.month).replace(/\s.*$/, ''),
        total: m.total,
      }));
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
    <Screen className="gap-5">
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

      <View className="flex-row items-center justify-center gap-4">
        <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="Periodo anterior">
          <Ionicons name="chevron-back" size={22} color="#9CA3AF" />
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
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
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
          <Ionicons
            name="chevron-forward"
            size={22}
            color={insights.isCurrentPeriod ? '#D1D5DB' : '#9CA3AF'}
          />
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

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 pb-24"
          showsVerticalScrollIndicator={false}
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
                    dotColor={opt.value === 'income' ? '#16A34A' : '#E5484D'}
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
            <MonthlyTrendChart months={period === 'year' ? 12 : 6} />
          )}

          {viewMode === 'calendar' && period !== 'year' && selectedDate ? (
            <DayDetailCard
              dateISO={selectedDate}
              transactions={tx}
              currency={currency}
              onPressTransaction={openTransaction}
            />
          ) : null}

          <InsightsStrip insights={insights} currency={currency} metric={heatmapMetric} />

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
