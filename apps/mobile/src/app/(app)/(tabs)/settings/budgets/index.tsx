import { useBudgetSpendTransactions, useBudgets } from '@repo/core/hooks';
import { budgetProgress, formatDate, toFriendlyMessage } from '@repo/core/utils';
import {
  BudgetsEmptyIllustration,
  EmptyState,
  ErrorCard,
  PageHeader,
  Screen,
  SegmentedControl,
  StaggerItem,
  useTabBarScrollPadding,
} from '@repo/ui';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { BudgetProgressBar } from '../../../../../features/budgets/budget-progress-bar';
import { useTabBarAction } from '../../../../../features/navigation/floating-tab-bar';

const STATUS_OPTIONS: { value: 'active' | 'archived'; label: string }[] = [
  { value: 'active', label: 'active' },
  { value: 'archived', label: 'archived' },
];

export default function BudgetsScreen() {
  const { t } = useTranslation('budgets');
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const { data: budgets, isLoading, error } = useBudgets();
  // Only the settled expenses in these budgets' current periods (summed
  // per budget below) — not the whole history.
  const { data: transactions } = useBudgetSpendTransactions(budgets, { includeArchived: true });

  const visible = (budgets ?? []).filter((b) => (status === 'archived' ? b.archived : !b.archived));

  useTabBarAction({
    icon: Plus,
    accessibilityLabel: t('new'),
    onPress: () => router.push('/(app)/settings/budgets/new'),
  });

  return (
    <Screen edges={['top']} className="gap-4">
      <PageHeader title={t('title')} onBack={() => router.back()} />

      <SegmentedControl
        options={STATUS_OPTIONS.map((o) => ({ ...o, label: t(`tabs.${o.value}`) }))}
        value={status}
        onChange={setStatus}
      />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, t('loadFailed'))} />
        </View>
      ) : visible.length === 0 ? (
        <EmptyState
          illustration={<BudgetsEmptyIllustration />}
          title={t(status === 'archived' ? 'emptyArchived' : 'empty')}
          description={status === 'archived' ? undefined : t('emptyHint')}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3"
          contentContainerStyle={{ paddingBottom: scrollPadding }}
        >
          {visible.map((b, i) => {
            const categoryIds = b.categories.map((c) => c.category.id);
            const progress = budgetProgress(
              categoryIds,
              Number(b.amount),
              b.currency,
              b,
              transactions ?? [],
            );
            const rangeLabel = `${formatDate(progress.from)} – ${formatDate(progress.to)}`;
            const periodLabel =
              b.period_type === 'custom'
                ? t('period.custom')
                : `${t(`period.${b.period_type}`)}${b.repeats ? t('repeatsSuffix') : ''}`;

            return (
              <StaggerItem key={b.id} index={i}>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/(app)/settings/budgets/[id]', params: { id: b.id } })
                  }
                  className="gap-3 rounded-2xl border border-line bg-surface p-4 active:opacity-70 dark:border-line-dark dark:bg-surface-dark"
                  style={b.archived ? { opacity: 0.6 } : undefined}
                >
                  <View>
                    <Text
                      className="text-base font-semibold text-ink dark:text-ink-dark"
                      numberOfLines={1}
                    >
                      {b.name}
                    </Text>
                    <Text className="text-xs text-ink-2 dark:text-ink-2-dark">{periodLabel}</Text>
                  </View>

                  <BudgetProgressBar
                    spent={progress.spent}
                    amount={Number(b.amount)}
                    pct={progress.pct}
                    isOverBudget={progress.isOverBudget}
                    currency={b.currency}
                    hasCategories={progress.hasCategories}
                  />

                  <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                    {t('categoriesCount', { count: b.categories.length })} · {rangeLabel}
                  </Text>
                </Pressable>
              </StaggerItem>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
