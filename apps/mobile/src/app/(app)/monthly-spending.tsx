import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useProfile, useTransactions } from '@repo/core/hooks';
import { categorySpendBreakdown, todayISODate } from '@repo/core/utils';
import { PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { CategorySpendDonut } from '../../features/home/category-spend-donut';
import { CategorySpendRow } from '../../features/home/category-spend-row';

export default function MonthlySpendingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ month?: string; label?: string }>();
  const month = params.month ?? todayISODate().slice(0, 7);

  const { data: accounts } = useAccounts();
  const { data: transactions, isLoading } = useTransactions();
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? accounts?.[0]?.currency ?? 'MXN';

  const breakdown = useMemo(
    () => categorySpendBreakdown(transactions ?? [], month),
    [transactions, month],
  );
  const total = breakdown.reduce((sum, c) => sum + c.total, 0);

  const goCategory = (categoryId: string) =>
    router.push({
      pathname: '/(app)/category-month-spending',
      params: { categoryId, month, label: params.label },
    });

  return (
    <Screen className="gap-5">
      <PageHeader
        title={params.label ? `Gastos · ${params.label}` : 'Gastos del mes'}
        onBack={() => router.back()}
      />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : total > 0 ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 pb-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center rounded-card bg-surface p-6 dark:bg-surface-dark">
            <CategorySpendDonut
              breakdown={breakdown}
              total={total}
              currency={currency}
              radius={110}
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
        </ScrollView>
      ) : (
        <View className="mt-16 items-center gap-2">
          <Ionicons name="pie-chart-outline" size={28} color="#9CA3AF" />
          <Text className="text-base font-semibold text-ink dark:text-ink-dark">Sin gastos</Text>
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
            No hay gastos registrados en este mes.
          </Text>
        </View>
      )}
    </Screen>
  );
}
