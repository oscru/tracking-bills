import {
  useBudgets,
  useDeleteBudget,
  useFormError,
  useStableRecord,
  useBudgetSpendTransactions,
  useUpdateBudget,
} from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import { budgetProgress, formatDate } from '@repo/core/utils';
import {
  Button,
  CategoryDot,
  ConfirmSheet,
  ErrorCard,
  PageHeader,
  Screen,
  useTabBarScrollPadding,
  HeroCard,
  useIsDesktop,
} from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { BudgetProgressBar } from '../../../../../../features/budgets/budget-progress-bar';
import { SplitColumns } from '../../../../../../features/design/split-columns';
import { useTabBarAction } from '../../../../../../features/navigation/floating-tab-bar';

export default function BudgetDetail() {
  const { t } = useTranslation(['budgets', 'common']);
  const scrollPadding = useTabBarScrollPadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const desktop = useIsDesktop();
  const { data: budgets, isLoading } = useBudgets();
  const updateBudget = useUpdateBudget();
  const remove = useDeleteBudget();
  const { error, setError } = useFormError();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const budget = useStableRecord((budgets ?? []).find((b) => b.id === id));
  // Only the settled expenses in this budget's current period — not the
  // whole history.
  const onlyThis = useMemo(() => (budget ? [budget] : undefined), [budget]);
  const { data: transactions } = useBudgetSpendTransactions(onlyThis, { includeArchived: true });

  useTabBarAction(
    budget
      ? {
          icon: Pencil,
          accessibilityLabel: t('edit'),
          onPress: () =>
            router.push({
              pathname: '/(app)/settings/budgets/[id]/edit',
              params: { id: budget.id },
            }),
        }
      : null,
  );

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!budget) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">{t('notFound')}</Text>
      </Screen>
    );
  }

  const categoryIds = budget.categories.map((c) => c.category.id);
  const progress = budgetProgress(
    categoryIds,
    Number(budget.amount),
    budget.currency,
    budget,
    transactions ?? [],
  );

  const rangeLabel = `${formatDate(progress.from)} – ${formatDate(progress.to)}`;
  const periodLabel =
    (budget.period_type === 'custom'
      ? rangeLabel
      : `${t(`period.${budget.period_type}`)}${budget.repeats ? t('repeatsSuffix') : ''} · ${rangeLabel}`) +
    ` · ${budget.currency}`;

  const toggleArchive = () =>
    updateBudget.mutate({ id: budget.id, patch: { archived: !budget.archived } });

  return (
    <Screen edges={['top']} className="gap-5" width={desktop ? 'wide' : undefined}>
      <PageHeader title={budget.name} onBack={() => router.back()} />

      <View className="flex-1 gap-5">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5"
          contentContainerStyle={{ paddingBottom: scrollPadding }}
        >
          <SplitColumns
            left={
              <>
                {budget.archived ? (
                  <View className="self-start rounded-full bg-line px-3 py-1 dark:bg-line-dark">
                    <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">
                      {t('archivedBadge')}
                    </Text>
                  </View>
                ) : null}

                {/* This period's spend vs. the limit — the screen's headline. */}
                <HeroCard contentStyle={{ gap: 12 }}>
                  <Text className="text-sm font-semibold text-white/70">{periodLabel}</Text>
                  <BudgetProgressBar
                    tone="onDark"
                    spent={progress.spent}
                    amount={Number(budget.amount)}
                    pct={progress.pct}
                    isOverBudget={progress.isOverBudget}
                    currency={budget.currency}
                    hasCategories={progress.hasCategories}
                  />
                </HeroCard>
              </>
            }
            right={
              <>
                <View className="gap-2">
                  <Text className="px-1 text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
                    {t('categoriesTitle', { count: budget.categories.length })}
                  </Text>
                  <View className="gap-3 rounded-2xl border border-line p-4 dark:border-line-dark">
                    {budget.categories.map(({ category: c, amount: allocated }, i) => {
                      const catProgress = budgetProgress(
                        [c.id],
                        allocated,
                        budget.currency,
                        budget,
                        transactions ?? [],
                      );
                      return (
                        <View
                          key={c.id}
                          className={
                            i > 0
                              ? 'gap-2 border-t border-line pt-3 dark:border-line-dark'
                              : 'gap-2'
                          }
                        >
                          <View className="flex-row items-center gap-2">
                            <CategoryDot color={c.color} icon={c.icon} size={14} />
                            <Text
                              className="flex-1 text-sm text-ink dark:text-ink-dark"
                              numberOfLines={1}
                            >
                              {resolveCategoryLabel(c)}
                            </Text>
                          </View>
                          <BudgetProgressBar
                            spent={catProgress.spent}
                            amount={allocated}
                            pct={catProgress.pct}
                            isOverBudget={catProgress.isOverBudget}
                            currency={budget.currency}
                            hasCategories={catProgress.hasCategories}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View className="gap-2 border-t border-line pt-5 dark:border-line-dark">
                  <Button
                    label={budget.archived ? t('common:unarchive') : t('archive')}
                    variant={budget.archived ? 'secondary' : 'ghost-danger'}
                    loading={updateBudget.isPending}
                    onPress={() => (budget.archived ? toggleArchive() : setConfirmArchive(true))}
                  />
                  {budget.archived ? (
                    <Pressable onPress={() => setConfirmDelete(true)} className="items-center py-2">
                      <Text className="text-sm font-medium text-danger dark:text-danger-dark">
                        {t('deleteForever')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <ErrorCard message={error} />
              </>
            }
          />
        </ScrollView>
      </View>

      <ConfirmSheet
        visible={confirmArchive}
        title={t('archiveTitle')}
        description={t('archiveBody')}
        confirmLabel={t('common:archive')}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          toggleArchive();
        }}
      />

      <ConfirmSheet
        visible={confirmDelete}
        title={t('deleteTitle')}
        description={t('deleteBody')}
        confirmLabel={t('common:delete')}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          remove.mutate(budget.id, {
            onSuccess: () => router.replace('/(app)/settings/budgets'),
            onError: (e) => setError(e, t('common:deleteFailed')),
          });
        }}
      />
    </Screen>
  );
}
