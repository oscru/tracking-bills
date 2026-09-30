import { useTransactions } from '@repo/core/hooks';
import {
  dailyTransactionTotals,
  formatCurrency,
  periodInsights,
  periodRange,
  todayISODate,
} from '@repo/core/utils';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const BAR_MAX_HEIGHT = 40;

interface Props {
  currency: string;
  onPress: () => void;
}

/** Home screen card: this week's spend at a glance — total, vs. last week,
 * and a Mon–Sun mini bar chart. Taps through to the full Análisis tab. */
export function WeeklySpendCard({ currency, onPress }: Props) {
  const { data: transactions } = useTransactions();
  const now = useMemo(() => new Date(), []);
  const today = todayISODate();

  const insights = useMemo(
    () => periodInsights(transactions ?? [], 'week', now, 'expense', today),
    [transactions, now, today],
  );
  const days = useMemo(() => {
    const { from, to } = periodRange('week', now);
    return dailyTransactionTotals(transactions ?? [], from, to, 'expense');
  }, [transactions, now]);

  const hasData = insights.currentAmount > 0;
  const maxDay = Math.max(1, ...days.map((d) => d.total));
  const changeUp = (insights.pctChangeVsPrevious ?? 0) >= 0;
  // More spend is worse, so "up" reads as bad (red) and "down" as good
  // (green) — the opposite of the income-change convention elsewhere.
  const changeColorClass =
    insights.pctChangeVsPrevious == null
      ? null
      : changeUp
        ? 'text-danger dark:text-danger-dark'
        : 'text-pos dark:text-pos-dark';

  return (
    <Pressable
      onPress={onPress}
      className="gap-4 rounded-card bg-surface p-5 active:opacity-80 dark:bg-surface-dark"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
          Gastos de la semana
        </Text>
        <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
          Ver análisis ›
        </Text>
      </View>

      {hasData ? (
        <>
          <View className="flex-row items-end justify-between">
            <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
              {formatCurrency(insights.currentAmount, currency)}
            </Text>
            {changeColorClass ? (
              <Text className={`text-[13px] font-semibold ${changeColorClass}`}>
                {changeUp ? '+' : ''}
                {Math.round(insights.pctChangeVsPrevious ?? 0)}% vs. semana pasada
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-end gap-2">
            {days.map((d, i) => {
              const isToday = d.date === today;
              return (
                <View key={d.date} className="flex-1 items-center gap-1.5">
                  <View
                    className="w-full items-center justify-end"
                    style={{ height: BAR_MAX_HEIGHT }}
                  >
                    <View
                      className={`w-full rounded-t-[4px] ${
                        isToday ? 'bg-lime' : 'bg-lime-tint dark:bg-lime-tint-dark'
                      }`}
                      style={{ height: Math.max(4, (d.total / maxDay) * BAR_MAX_HEIGHT) }}
                    />
                  </View>
                  <Text
                    className={`text-[10px] font-medium ${
                      isToday ? 'text-ink dark:text-ink-dark' : 'text-ink-3 dark:text-ink-3-dark'
                    }`}
                  >
                    {WEEKDAY_LABELS[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <Text className="py-2 text-sm text-ink-2 dark:text-ink-2-dark">
          Sin gastos esta semana todavía.
        </Text>
      )}
    </Pressable>
  );
}
