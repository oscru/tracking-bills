import {
  useBudgets,
  useCategories,
  useDeleteCategory,
  useFavoriteTransactions,
  useFormError,
  useStableRecord,
  useCategoryDailyTotals,
  useUpdateCategory,
} from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import { formatDate, formatDateTime } from '@repo/core/utils';
import type { Category } from '@repo/core/types';
import {
  Button,
  CategoryDot,
  ConfirmSheet,
  ErrorCard,
  PageHeader,
  Screen,
  useTabBarScrollPadding,
  useIsDesktop,
} from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CategoryDetailSkeleton } from '../../../../../../features/categories/category-detail-skeleton';
import { CategoryHistoryChart } from '../../../../../../features/categories/category-history-chart';
import { SplitColumns } from '../../../../../../features/design/split-columns';
import { RecordInfoButton } from '../../../../../../features/design/record-info';
import { useTabBarAction } from '../../../../../../features/navigation/floating-tab-bar';

/** Why `category` can't be deleted right now, or `null` if it can. Mirrors
 * the DB trigger `check_category_deletable` exactly — every FK pointing at
 * `categories` resolves destructively on delete (set-null or cascade, never
 * restrict), so this is the one place that's allowed to be lenient without
 * risking silently losing history, a favorite, or a budget's assignment. */
type BlockReason = 'system' | 'notArchived' | 'hasTransactions' | 'inFavorite' | 'inBudget';

function categoryBlockReason(
  category: Category,
  transactions: { category_id: string | null }[],
  favorites: { category_id: string | null }[],
  budgets: { categories: { category: { id: string } }[] }[],
): BlockReason | null {
  if (category.slug) return 'system';
  if (!category.archived) return 'notArchived';
  if (transactions.some((tx) => tx.category_id === category.id)) return 'hasTransactions';
  if (favorites.some((f) => f.category_id === category.id)) return 'inFavorite';
  if (budgets.some((b) => b.categories.some((c) => c.category.id === category.id))) {
    return 'inBudget';
  }
  return null;
}

export default function CategoryDetail() {
  const { t } = useTranslation(['categories', 'common']);
  const scrollPadding = useTabBarScrollPadding();
  const { id, fromTransactionId } = useLocalSearchParams<{
    id: string;
    /** Set only when we were pushed straight from a transaction's detail
     * screen — that's a cross-tab push (this route lives in the settings
     * tab), so the default `router.back()` has nothing correct to pop to
     * and would bubble out to the home tab instead. Route back there
     * explicitly instead; every other entry point (the categories list, a
     * parent category's subcategory list) is a same-tab push and keeps
     * using plain `back()`. */
    fromTransactionId?: string;
  }>();
  const router = useRouter();
  const desktop = useIsDesktop();
  const { data: categories, isLoading } = useCategories();
  const { data: favorites } = useFavoriteTransactions();
  const { data: budgets } = useBudgets();
  const updateCategory = useUpdateCategory();
  const removeCategory = useDeleteCategory();
  const { error, setError } = useFormError();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const category = useStableRecord((categories ?? []).find((c) => c.id === id));
  const subcategories = (categories ?? []).filter((c) => c.parent_id === id);
  // Which of these categories have movements (any status) — one row per day
  // each was used, from Postgres; the same query the chart below reads.
  const { data: categoryDays } = useCategoryDailyTotals([id, ...subcategories.map((s) => s.id)]);
  // Archiving the parent cascades to these atomically at the DB level
  // (`categories_cascade_archive_subcategories`) — surfaced here only so the
  // confirm dialog can tell the user it's about to happen.
  const activeSubcategories = subcategories.filter((s) => !s.archived);

  const goBack = () =>
    fromTransactionId
      ? router.navigate({ pathname: '/(app)/transactions/[id]', params: { id: fromTransactionId } })
      : router.back();

  useTabBarAction(
    category
      ? {
          icon: Pencil,
          accessibilityLabel: t('edit'),
          onPress: () =>
            router.push({
              pathname: '/(app)/settings/categories/[id]/edit',
              params: { id: category.id },
            }),
        }
      : null,
  );

  if (isLoading) {
    return (
      <Screen edges={['top']} className="gap-5" width={desktop ? 'wide' : undefined}>
        <PageHeader title={t('category')} onBack={goBack} />
        <CategoryDetailSkeleton />
      </Screen>
    );
  }
  if (!category) {
    return (
      <Screen className="gap-4">
        <PageHeader title={t('category')} onBack={goBack} />
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">{t('notFound')}</Text>
      </Screen>
    );
  }

  const toggleArchive = () =>
    updateCategory.mutate({ id: category.id, patch: { archived: !category.archived } });

  // Deleting the parent cascades to every subcategory at the DB level too
  // (`parent_id on delete cascade`) — if ANY of them can't be deleted
  // either, the whole thing fails, so surface the first one here instead of
  // letting the user hit that only after confirming.
  const ownBlockReason = categoryBlockReason(
    category,
    categoryDays ?? [],
    favorites ?? [],
    budgets ?? [],
  );
  const blockedSubcategory = subcategories
    .map((s) => ({
      s,
      reason: categoryBlockReason(s, categoryDays ?? [], favorites ?? [], budgets ?? []),
    }))
    .find((x) => x.reason != null);
  const deleteBlockedReason = ownBlockReason
    ? t(`deleteBlocked.${ownBlockReason}`)
    : blockedSubcategory?.reason
      ? t(`deleteBlockedSub.${blockedSubcategory.reason}`, {
          name: resolveCategoryLabel(blockedSubcategory.s),
        })
      : null;

  // Its first and last movement (this category and its subcategories),
  // from the same per-day totals the chart reads — ISO dates sort as text.
  const usedDays = (categoryDays ?? []).map((d) => d.date).sort();
  const parent = category.parent_id
    ? (categories ?? []).find((c) => c.id === category.parent_id)
    : undefined;
  const infoRows = [
    { label: t('info.type'), value: t(`type.${category.type}`) },
    { label: t('info.parent'), value: parent ? resolveCategoryLabel(parent) : '' },
    {
      label: t('info.subcategories'),
      value: category.parent_id ? '' : String(subcategories.length),
    },
    { label: t('info.origin'), value: t(category.slug ? 'info.system' : 'info.yours') },
    { label: t('info.first'), value: usedDays[0] ? formatDate(usedDays[0]) : t('info.none') },
    { label: t('info.last'), value: usedDays.at(-1) ? formatDate(usedDays.at(-1)!) : '' },
    { label: t('common:info.created'), value: formatDateTime(category.created_at) },
    { label: t('common:info.updated'), value: formatDateTime(category.updated_at) },
    {
      label: t('common:info.archived'),
      value: category.archived_at ? formatDateTime(category.archived_at) : '',
    },
  ];

  return (
    <Screen edges={['top']} className="gap-5" width={desktop ? 'wide' : undefined}>
      <PageHeader
        title={resolveCategoryLabel(category)}
        onBack={goBack}
        action={<RecordInfoButton title={t('info.title')} rows={infoRows} />}
      />

      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollPadding }}
        >
          <SplitColumns
            rightWidth={360}
            // The chart needs room; in the pane beside the list, it stacks.
            minWidth={900}
            left={
              <>
                <View className="flex-row items-center gap-2">
                  <CategoryDot color={category.color} icon={category.icon} size={17} />
                  <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
                    {t(`type.${category.type}`)}
                    {category.archived ? t('archivedSuffix') : ''}
                  </Text>
                </View>

                <CategoryHistoryChart category={category} subcategories={subcategories} />
              </>
            }
            right={
              <>
                {subcategories.length > 0 ? (
                  <View className="gap-2">
                    <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
                      {t('subcategories')}
                    </Text>
                    <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
                      {subcategories.map((s, i) => (
                        <View key={s.id}>
                          {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
                          <Pressable
                            onPress={() =>
                              router.push({
                                pathname: '/(app)/settings/categories/[id]',
                                params: { id: s.id },
                              })
                            }
                            className="flex-row items-center gap-3 py-3.5 active:opacity-60"
                          >
                            <CategoryDot color={s.color} icon={s.icon} size={16} />
                            <Text className="flex-1 text-base text-ink dark:text-ink-dark">
                              {resolveCategoryLabel(s)}
                              {s.archived ? ' · archivada' : ''}
                            </Text>
                            <Text className="text-lg text-ink-3 dark:text-ink-3-dark">›</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View className="gap-3 border-t border-line pt-5 dark:border-line-dark">
                  <Button
                    label={t(category.archived ? 'common:unarchive' : 'common:archive')}
                    variant={category.archived ? 'secondary' : 'ghost-danger'}
                    loading={updateCategory.isPending}
                    onPress={() => (category.archived ? toggleArchive() : setConfirmArchive(true))}
                  />

                  {category.archived ? (
                    <View className="gap-1.5">
                      <Pressable
                        onPress={() => (deleteBlockedReason ? null : setConfirmDelete(true))}
                        disabled={Boolean(deleteBlockedReason)}
                        className="items-center py-2"
                        style={deleteBlockedReason ? { opacity: 0.4 } : undefined}
                      >
                        <Text className="text-sm font-medium text-danger dark:text-danger-dark">
                          {t('deleteForever')}
                        </Text>
                      </Pressable>
                      {deleteBlockedReason ? (
                        <Text className="px-4 text-center text-xs text-ink-2 dark:text-ink-2-dark">
                          {deleteBlockedReason}
                        </Text>
                      ) : null}
                    </View>
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
        description={
          activeSubcategories.length > 0
            ? t('archiveBodySubs', {
                count: activeSubcategories.length,
                names: activeSubcategories.map((s) => resolveCategoryLabel(s)).join(', '),
              })
            : t('archiveBody')
        }
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
        description={
          subcategories.length > 0
            ? t('deleteBodySubs', {
                count: subcategories.length,
                names: subcategories.map((s) => resolveCategoryLabel(s)).join(', '),
              })
            : t('deleteBody')
        }
        confirmLabel={t('common:delete')}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          removeCategory.mutate(category.id, {
            onSuccess: goBack,
            onError: (e) => setError(e, t('common:deleteFailed')),
          });
        }}
      />
    </Screen>
  );
}
