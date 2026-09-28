import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useCategories, useTransactions } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionWithRefs } from '@repo/core/supabase';
import { categorySpendBreakdown, formatCurrency, formatDate, todayISODate } from '@repo/core/utils';
import { CategoryDot, PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { CategorySpendDonut } from '../../features/home/category-spend-donut';
import { CategorySpendRow } from '../../features/home/category-spend-row';

/** One actual expense in the list below the subcategory breakdown. */
function ExpenseRow({
  tx,
  currency,
  onPress,
}: {
  tx: TransactionWithRefs;
  currency: string;
  onPress: () => void;
}) {
  const description = tx.description?.trim();
  const categoryLabel = tx.category ? resolveCategoryLabel(tx.category) : 'Sin categoría';

  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3 active:opacity-60">
      <CategoryDot color={tx.category?.color} icon={tx.category?.icon} size={18} />
      <View className="flex-1">
        <Text className="text-[15px] font-medium text-ink dark:text-ink-dark" numberOfLines={1}>
          {description || categoryLabel}
        </Text>
        <Text className="text-xs text-ink-3 dark:text-ink-3-dark" numberOfLines={1}>
          {description ? `${categoryLabel} · ` : ''}
          {formatDate(tx.transaction_date)}
        </Text>
      </View>
      <Text className="text-[15px] font-semibold text-danger dark:text-danger-dark">
        −{formatCurrency(tx.amount, currency)}
      </Text>
    </Pressable>
  );
}

export default function CategoryMonthSpendingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId: string; month?: string; label?: string }>();
  const month = params.month ?? todayISODate().slice(0, 7);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: transactions, isLoading } = useTransactions();
  const currency = accounts?.[0]?.currency ?? 'MXN';

  const category = (categories ?? []).find((c) => c.id === params.categoryId) ?? null;

  // This category's own expenses plus its subcategories' — a subcategory is
  // as far as this app's hierarchy goes, so one level down covers everything.
  const relevantIds = useMemo(() => {
    const subIds = (categories ?? [])
      .filter((c) => c.parent_id === params.categoryId)
      .map((c) => c.id);
    return new Set([params.categoryId, ...subIds]);
  }, [categories, params.categoryId]);

  const categoryTx = useMemo(
    () =>
      (transactions ?? [])
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.transaction_date.startsWith(month) &&
            t.category != null &&
            relevantIds.has(t.category.id),
        )
        .sort(
          (a, b) =>
            b.transaction_date.localeCompare(a.transaction_date) ||
            b.created_at.localeCompare(a.created_at),
        ),
    [transactions, month, relevantIds],
  );

  // Same breakdown shape as the month-wide one, just scoped to this
  // category's transactions — each slice lands on a subcategory (or this
  // category itself, for expenses not further broken down).
  const breakdown = useMemo(() => categorySpendBreakdown(categoryTx, month), [categoryTx, month]);
  const total = breakdown.reduce((sum, c) => sum + c.total, 0);

  const goTransaction = (id: string) =>
    router.push({ pathname: '/(app)/transactions/[id]', params: { id } });

  // Always lands on the month's overall breakdown, regardless of how this
  // screen was reached (the "Ver todas" list, or straight from Home's top-5)
  // — "back" from a category's own chart should mean "back to the month".
  const goBackToMonth = () =>
    router.replace({
      pathname: '/(app)/monthly-spending',
      params: { month, label: params.label },
    });

  const title = category ? resolveCategoryLabel(category) : 'Categoría';

  return (
    <Screen className="gap-5">
      <PageHeader
        title={params.label ? `${title} · ${params.label}` : title}
        onBack={goBackToMonth}
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
              radius={100}
            />
          </View>

          {breakdown.length > 1 ? (
            <View className="gap-1">
              <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
                Por subcategoría
              </Text>
              <View className="rounded-card border border-line px-4 dark:border-line-dark">
                {breakdown.map((c, i) => (
                  <View key={c.categoryId ?? 'none'}>
                    {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
                    <CategorySpendRow entry={c} total={total} currency={currency} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View className="gap-1">
            <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
              Movimientos · {categoryTx.length}
            </Text>
            <View className="rounded-card border border-line px-4 dark:border-line-dark">
              {categoryTx.map((tx, i) => (
                <View key={tx.id}>
                  {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
                  <ExpenseRow tx={tx} currency={currency} onPress={() => goTransaction(tx.id)} />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <View className="mt-16 items-center gap-2">
          <Ionicons name="pie-chart-outline" size={28} color="#9CA3AF" />
          <Text className="text-base font-semibold text-ink dark:text-ink-dark">Sin gastos</Text>
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
            Sin movimientos en esta categoría este mes.
          </Text>
        </View>
      )}
    </Screen>
  );
}
