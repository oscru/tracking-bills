import { useTransactions } from '@repo/core/hooks';
import {
  dailyTransactionTotals,
  formatCurrency,
  groupByAccountCurrency,
  periodInsights,
  periodRange,
  previousPeriodRange,
  todayISODate,
} from '@repo/core/utils';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { weekdayInitials } from '../transactions/calendar-grid';

const BAR_MAX_HEIGHT = 40;
// `fill`: the weekday letters under the bars, and the shortest bars may get.
const DAY_LABEL_HEIGHT = 20;
const FILL_MIN_BAR_HEIGHT = 32;

interface Props {
  onPress: () => void;
  /**
   * Fill the parent (a Home grid cell): the bars grow into the room the
   * card has, instead of a fixed 40px.
   */
  fill?: boolean;
}

/** Home screen card: this week's spend at a glance — total, vs. last week,
 * and a Mon–Sun mini bar chart. Taps through to the full Análisis tab. One
 * section per currency present, never blended together. */
export function WeeklySpendCard({ onPress, fill = false }: Props) {
  const { t } = useTranslation('home');
  const weekdays = weekdayInitials();
  // `fill`: the height left for the bars (one currency; several stack at the fixed height).
  const [barsArea, setBarsArea] = useState(0);
  const now = useMemo(() => new Date(), []);
  // Just this week and the one before (what the card compares) — not the
  // whole history.
  const filters = useMemo(
    () => ({ from: previousPeriodRange('week', now).from, isCompleted: true }),
    [now],
  );
  const { data: transactions } = useTransactions(filters);
  const today = todayISODate();

  const groups = useMemo(() => {
    const { from, to } = periodRange('week', now);
    return groupByAccountCurrency(transactions ?? [])
      .map((g) => ({
        currency: g.currency,
        insights: periodInsights(g.transactions, 'week', now, 'expense', today),
        days: dailyTransactionTotals(g.transactions, from, to, 'expense'),
      }))
      .filter((g) => g.insights.currentAmount > 0);
  }, [transactions, now, today]);
  const hasData = groups.length > 0;

  return (
    <Pressable
      onPress={onPress}
      className={`gap-4 rounded-card bg-surface p-5 active:opacity-80 dark:bg-surface-dark ${
        fill ? 'flex-1' : ''
      }`}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
          {t('weeklySpend.title')}
        </Text>
        <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
          {t('weeklySpend.seeInsights')}
        </Text>
      </View>

      {hasData ? (
        <View className={fill ? 'flex-1 gap-4' : 'gap-4'}>
          {groups.map(({ currency, insights, days }) => {
            const grow = fill && groups.length === 1;
            const barMax = grow
              ? Math.max(FILL_MIN_BAR_HEIGHT, barsArea - DAY_LABEL_HEIGHT)
              : BAR_MAX_HEIGHT;
            const maxDay = Math.max(1, ...days.map((d) => d.total));
            const changeUp = (insights.pctChangeVsPrevious ?? 0) >= 0;
            // More spend is worse, so "up" reads as bad (red) and "down" as
            // good (green) — the opposite of the income-change convention
            // elsewhere.
            const changeColorClass =
              insights.pctChangeVsPrevious == null
                ? null
                : changeUp
                  ? 'text-danger dark:text-danger-dark'
                  : 'text-pos dark:text-pos-dark';

            return (
              <View key={currency} className={grow ? 'flex-1 gap-2' : 'gap-2'}>
                {groups.length > 1 ? (
                  <Text className="text-xs font-semibold text-ink-3 dark:text-ink-3-dark">
                    {currency}
                  </Text>
                ) : null}

                <View className="flex-row items-end justify-between">
                  <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
                    {formatCurrency(insights.currentAmount, currency)}
                  </Text>
                  {changeColorClass ? (
                    <Text className={`text-[13px] font-semibold ${changeColorClass}`}>
                      {t('weeklySpend.vsLastWeek', {
                        change: `${changeUp ? '+' : ''}${Math.round(insights.pctChangeVsPrevious ?? 0)}`,
                      })}
                    </Text>
                  ) : null}
                </View>

                <View
                  className={grow ? 'flex-1 flex-row items-end gap-2' : 'flex-row items-end gap-2'}
                  onLayout={grow ? (e) => setBarsArea(e.nativeEvent.layout.height) : undefined}
                >
                  {days.map((d, i) => {
                    const isToday = d.date === today;
                    return (
                      <View key={d.date} className="flex-1 items-center gap-1.5">
                        <View
                          className="w-full items-center justify-end"
                          style={{ height: barMax }}
                        >
                          <View
                            className={`w-full rounded-t-[4px] ${
                              isToday ? 'bg-lime' : 'bg-lime-tint dark:bg-lime-tint-dark'
                            }`}
                            style={{ height: Math.max(4, (d.total / maxDay) * barMax) }}
                          />
                        </View>
                        <Text
                          className={`text-[10px] font-medium ${
                            isToday
                              ? 'text-ink dark:text-ink-dark'
                              : 'text-ink-3 dark:text-ink-3-dark'
                          }`}
                        >
                          {weekdays[i]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text className="py-2 text-sm text-ink-2 dark:text-ink-2-dark">
          {t('weeklySpend.empty')}
        </Text>
      )}
    </Pressable>
  );
}
