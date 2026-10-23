import { useCategories, useTransactions } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionWithRefs } from '@repo/core/supabase';
import {
  categorySpendBreakdown,
  formatCurrency,
  formatDate,
  groupByAccountCurrency,
  todayISODate,
} from '@repo/core/utils';
import { CategoryDot, PageHeader, Screen, ICON_COLORS, useIsWideDesktop } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChartPie } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CategorySpendDonut } from '../../features/home/category-spend-donut';
import { CategorySpendRow } from '../../features/home/category-spend-row';
import { CategorySpendSkeleton } from '../../features/home/category-spend-skeleton';

/** One actual expense in the list below the subcategory breakdown — always
 * formatted in its own account's currency, never a shared default. */
function ExpenseRow({ tx, onPress }: { tx: TransactionWithRefs; onPress: () => void }) {
  const { t } = useTranslation('transactions');
  const description = tx.description?.trim();
  const categoryLabel = tx.category ? resolveCategoryLabel(tx.category) : t('row.noCategory');

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
        −{formatCurrency(tx.amount, tx.account?.currency ?? 'MXN')}
      </Text>
    </Pressable>
  );
}

export default function CategoryMonthSpendingScreen() {
  const { t } = useTranslation('analytics');
  const router = useRouter();
  // Two columns only on a wide desktop; a compact one stacks them, as on phones.
  const twoColumns = useIsWideDesktop();
  const params = useLocalSearchParams<{ categoryId: string; month?: string; label?: string }>();
  const month = params.month ?? todayISODate().slice(0, 7);

  const { data: categories, isLoading: loadingCategories } = useCategories();

  const category = (categories ?? []).find((c) => c.id === params.categoryId) ?? null;

  // This category's own expenses plus its subcategories' — a subcategory is
  // as far as this app's hierarchy goes, so one level down covers everything.
  const relevantIds = useMemo(() => {
    const subIds = (categories ?? [])
      .filter((c) => c.parent_id === params.categoryId)
      .map((c) => c.id);
    return new Set([params.categoryId, ...subIds]);
  }, [categories, params.categoryId]);

  // Only this month's settled expenses in these categories, filtered by the
  // server — not the whole history.
  const filters = useMemo(
    () => ({
      from: `${month}-01`,
      to: todayISODate(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)),
      type: 'expense' as const,
      isCompleted: true,
      categoryIds: [...relevantIds].sort(),
    }),
    [month, relevantIds],
  );
  const { data: transactions, isLoading: loadingTx } = useTransactions(filters, {
    enabled: categories != null,
  });
  const isLoading = loadingCategories || loadingTx;

  const categoryTx = useMemo(
    () =>
      (transactions ?? [])
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.is_completed &&
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

  // One breakdown per currency present among this category's expenses — each
  // slice lands on a subcategory (or this category itself, for expenses not
  // further broken down).
  const groups = useMemo(() => {
    return groupByAccountCurrency(categoryTx)
      .map((g) => ({
        currency: g.currency,
        transactions: g.transactions,
        breakdown: categorySpendBreakdown(g.transactions, month),
      }))
      .filter((g) => g.breakdown.length > 0);
  }, [categoryTx, month]);
  const total = categoryTx.reduce((sum, t) => sum + Number(t.amount), 0);

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

  const title = category ? resolveCategoryLabel(category) : t('category.fallbackTitle');

  // Desktop: the donut as big as its column allows, within reason.
  const [chartWidth, setChartWidth] = useState<number | null>(null);
  const chartRadius = chartWidth
    ? Math.round(Math.max(110, Math.min(220, (chartWidth - 48) / 2)))
    : 165;

  const charts = (
    <>
      {groups.map((g) => (
        <View key={g.currency} className="gap-5">
          {groups.length > 1 ? (
            <Text className="px-1 text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
              {g.currency}
            </Text>
          ) : null}

          <View className="items-center rounded-card bg-surface p-6 dark:bg-surface-dark">
            <CategorySpendDonut
              breakdown={g.breakdown}
              total={g.breakdown.reduce((sum, c) => sum + c.total, 0)}
              currency={g.currency}
              radius={twoColumns ? chartRadius : 100}
            />
          </View>

          {g.breakdown.length > 1 ? (
            <View className="gap-1">
              <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
                {t('category.bySubcategory')}
              </Text>
              <View className="rounded-card border border-line px-4 dark:border-line-dark">
                {g.breakdown.map((c, i) => (
                  <View key={c.categoryId ?? 'none'}>
                    {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
                    <CategorySpendRow
                      entry={c}
                      total={g.breakdown.reduce((sum, x) => sum + x.total, 0)}
                      currency={g.currency}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ))}
    </>
  );
  const movements = (
    <View className="gap-1">
      <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
        {t('category.movements', { count: categoryTx.length })}
      </Text>
      <View className="rounded-card border border-line px-4 dark:border-line-dark">
        {categoryTx.map((tx, i) => (
          <View key={tx.id}>
            {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
            <ExpenseRow tx={tx} onPress={() => goTransaction(tx.id)} />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Screen className="gap-5" width={twoColumns ? 'wide' : undefined}>
      <PageHeader
        title={params.label ? `${title} · ${params.label}` : title}
        onBack={goBackToMonth}
      />

      {isLoading ? (
        <CategorySpendSkeleton
          sections={[
            { title: true, rows: 2 },
            { title: true, rows: 3 },
          ]}
        />
      ) : total > 0 ? (
        twoColumns ? (
          // Desktop: charts (~60%, the donut growing with the window) and
          // the expenses (~30%), each column scrolling on its own.
          <View className="flex-1 flex-row gap-6 pb-6">
            <View style={{ flex: 2 }} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
              <ScrollView
                className="flex-1"
                contentContainerClassName="gap-5"
                showsVerticalScrollIndicator={false}
              >
                {charts}
              </ScrollView>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {movements}
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-5 pb-8"
            showsVerticalScrollIndicator={false}
          >
            {charts}
            {movements}
          </ScrollView>
        )
      ) : (
        <View className="mt-16 items-center gap-2">
          <ChartPie size={28} color={ICON_COLORS.ink3} />
          <Text className="text-base font-semibold text-ink dark:text-ink-dark">
            {t('monthly.empty')}
          </Text>
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{t('category.emptyBody')}</Text>
        </View>
      )}
    </Screen>
  );
}
