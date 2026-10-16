import { useCategories, useMonthlyCategoryTotals } from '@repo/core/hooks';
import { categorySpendFromSummary, todayISODate } from '@repo/core/utils';
import { PageHeader, Screen, ICON_COLORS, useIsDesktop } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChartPie } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { CategorySpendDonut } from '../../features/home/category-spend-donut';
import { CategorySpendRow } from '../../features/home/category-spend-row';
import { CategorySpendSkeleton } from '../../features/home/category-spend-skeleton';

export default function MonthlySpendingScreen() {
  const router = useRouter();
  const desktop = useIsDesktop();
  const params = useLocalSearchParams<{ month?: string; label?: string }>();
  const month = params.month ?? todayISODate().slice(0, 7);

  // Month totals pre-summed per category by Postgres (the same query Inicio
  // uses, so coming from there it's already cached).
  const { data: summary, isLoading } = useMonthlyCategoryTotals();
  const { data: categories } = useCategories();

  // One section per currency present — never blended together.
  const groups = useMemo(
    () => categorySpendFromSummary(summary ?? [], month, categories ?? []),
    [summary, month, categories],
  );
  const hasData = groups.length > 0;

  // Desktop: the donut fills its column — as big as its width and height
  // allow, within reason.
  const [chartBox, setChartBox] = useState<{ width: number; height: number } | null>(null);
  const chartRadius = chartBox
    ? Math.round(
        Math.max(
          110,
          Math.min(
            260,
            (chartBox.width - 48) / 2,
            // Each card fits the column's height (one currency per card;
            // a second one scrolls into view below).
            (chartBox.height - 48 - (groups.length > 1 ? 36 : 0)) / 2,
          ),
        ),
      )
    : 165;

  const goCategory = (categoryId: string) =>
    router.push({
      pathname: '/(app)/category-month-spending',
      params: { categoryId, month, label: params.label },
    });

  return (
    <Screen className="gap-5" width={desktop ? 'wide' : undefined}>
      <PageHeader
        title={params.label ? `Gastos · ${params.label}` : 'Gastos del mes'}
        onBack={() => router.back()}
      />

      {isLoading ? (
        <CategorySpendSkeleton sections={[{ title: false, rows: 4 }]} />
      ) : hasData ? (
        desktop ? (
          // Desktop: the donut takes ~60% and grows with the window; the
          // category list beside it (~30%) scrolls on its own.
          <View className="flex-1 flex-row gap-6 pb-6">
            <View style={{ flex: 2 }} onLayout={(e) => setChartBox(e.nativeEvent.layout)}>
              <ScrollView
                className="flex-1"
                contentContainerClassName="gap-5"
                showsVerticalScrollIndicator={false}
              >
                {groups.map(({ currency, breakdown }) => (
                  <View
                    key={currency}
                    style={
                      groups.length === 1 && chartBox ? { minHeight: chartBox.height } : undefined
                    }
                    className="items-center justify-center gap-4 rounded-card bg-surface p-6 dark:bg-surface-dark"
                  >
                    {groups.length > 1 ? (
                      <Text className="self-start text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
                        {currency}
                      </Text>
                    ) : null}
                    <CategorySpendDonut
                      breakdown={breakdown}
                      total={breakdown.reduce((sum, c) => sum + c.total, 0)}
                      currency={currency}
                      radius={chartRadius}
                      onSlicePress={goCategory}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerClassName="gap-5"
              showsVerticalScrollIndicator={false}
            >
              {groups.map(({ currency, breakdown }) => {
                const total = breakdown.reduce((sum, c) => sum + c.total, 0);
                return (
                  <View key={currency} className="gap-2">
                    {groups.length > 1 ? (
                      <Text className="px-1 text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
                        {currency}
                      </Text>
                    ) : null}
                    <View className="rounded-card border border-line px-4 dark:border-line-dark">
                      {breakdown.map((c, i) => (
                        <View key={c.categoryId ?? 'none'}>
                          {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
                          <CategorySpendRow
                            entry={c}
                            total={total}
                            currency={currency}
                            onPress={c.categoryId ? () => goCategory(c.categoryId!) : undefined}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-8 pb-8"
            showsVerticalScrollIndicator={false}
          >
            {groups.map(({ currency, breakdown }) => {
              const total = breakdown.reduce((sum, c) => sum + c.total, 0);
              return (
                <View key={currency} className="gap-5">
                  {groups.length > 1 ? (
                    <Text className="px-1 text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
                      {currency}
                    </Text>
                  ) : null}

                  <View className="gap-5">
                    <View className="items-center rounded-card bg-surface p-6 dark:bg-surface-dark">
                      <CategorySpendDonut
                        breakdown={breakdown}
                        total={total}
                        currency={currency}
                        radius={110}
                        onSlicePress={goCategory}
                      />
                    </View>

                    <View className="rounded-card border border-line px-4 dark:border-line-dark">
                      {breakdown.map((c, i) => (
                        <View key={c.categoryId ?? 'none'}>
                          {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
                          <CategorySpendRow
                            entry={c}
                            total={total}
                            currency={currency}
                            onPress={c.categoryId ? () => goCategory(c.categoryId!) : undefined}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )
      ) : (
        <View className="mt-16 items-center gap-2">
          <ChartPie size={28} color={ICON_COLORS.ink3} />
          <Text className="text-base font-semibold text-ink dark:text-ink-dark">Sin gastos</Text>
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
            No hay gastos registrados en este mes.
          </Text>
        </View>
      )}
    </Screen>
  );
}
