import {
  useBudgets,
  useCategories,
  useDeleteCategory,
  useFavoriteTransactions,
  useFormError,
  useTransactions,
  useUpdateCategory,
} from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { Category } from '@repo/core/types';
import { Button, CategoryDot, ConfirmSheet, ErrorCard, Fab, PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CategoryDetailSkeleton } from '../../../../../../features/categories/category-detail-skeleton';
import { CategoryHistoryChart } from '../../../../../../features/categories/category-history-chart';

/** Why `category` can't be deleted right now, or `null` if it can. Mirrors
 * the DB trigger `check_category_deletable` exactly — every FK pointing at
 * `categories` resolves destructively on delete (set-null or cascade, never
 * restrict), so this is the one place that's allowed to be lenient without
 * risking silently losing history, a favorite, or a budget's assignment. */
function categoryBlockReason(
  category: Category,
  transactions: { category_id: string | null }[],
  favorites: { category_id: string | null }[],
  budgets: { categories: { category: { id: string } }[] }[],
): string | null {
  if (category.slug) return 'es una categoría del sistema';
  if (!category.archived) return 'no está archivada';
  if (transactions.some((t) => t.category_id === category.id)) return 'tiene movimientos asociados';
  if (favorites.some((f) => f.category_id === category.id)) return 'está asignada a un movimiento favorito';
  if (budgets.some((b) => b.categories.some((c) => c.category.id === category.id))) {
    return 'está asignada a un presupuesto';
  }
  return null;
}

export default function CategoryDetail() {
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
  const { data: categories, isLoading } = useCategories();
  const { data: transactions } = useTransactions();
  const { data: favorites } = useFavoriteTransactions();
  const { data: budgets } = useBudgets();
  const updateCategory = useUpdateCategory();
  const removeCategory = useDeleteCategory();
  const { error, setError } = useFormError();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const category = (categories ?? []).find((c) => c.id === id);
  const subcategories = (categories ?? []).filter((c) => c.parent_id === id);
  // Archiving the parent cascades to these atomically at the DB level
  // (`categories_cascade_archive_subcategories`) — surfaced here only so the
  // confirm dialog can tell the user it's about to happen.
  const activeSubcategories = subcategories.filter((s) => !s.archived);

  const goBack = () =>
    fromTransactionId
      ? router.navigate({ pathname: '/(app)/transactions/[id]', params: { id: fromTransactionId } })
      : router.back();

  if (isLoading) {
    return (
      <Screen edges={['top']} className="gap-5">
        <PageHeader title="Categoría" onBack={goBack} />
        <CategoryDetailSkeleton />
      </Screen>
    );
  }
  if (!category) {
    return (
      <Screen className="gap-4">
        <PageHeader title="Categoría" onBack={goBack} />
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Categoría no encontrada.</Text>
      </Screen>
    );
  }

  const toggleArchive = () =>
    updateCategory.mutate({ id: category.id, patch: { archived: !category.archived } });

  // Deleting the parent cascades to every subcategory at the DB level too
  // (`parent_id on delete cascade`) — if ANY of them can't be deleted
  // either, the whole thing fails, so surface the first one here instead of
  // letting the user hit that only after confirming.
  const ownBlockReason = categoryBlockReason(category, transactions ?? [], favorites ?? [], budgets ?? []);
  const blockedSubcategory = subcategories
    .map((s) => ({ s, reason: categoryBlockReason(s, transactions ?? [], favorites ?? [], budgets ?? []) }))
    .find((x) => x.reason != null);
  const deleteBlockedReason = ownBlockReason
    ? `No puedes eliminarla: ${ownBlockReason}.`
    : blockedSubcategory
      ? `No puedes eliminarla: su subcategoría "${resolveCategoryLabel(blockedSubcategory.s)}" ${blockedSubcategory.reason}.`
      : null;

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader title={resolveCategoryLabel(category)} onBack={goBack} />

      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 pb-24"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center gap-2">
            <CategoryDot color={category.color} icon={category.icon} size={17} />
            <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
              {category.type === 'income' ? 'Ingreso' : 'Gasto'}
              {category.archived ? ' · archivada' : ''}
            </Text>
          </View>

          <CategoryHistoryChart categoryId={category.id} color={category.color} />

          {subcategories.length > 0 ? (
            <View className="gap-2">
              <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
                Subcategorías
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
              label={category.archived ? 'Desarchivar' : 'Archivar'}
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
                    Eliminar definitivamente
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
        </ScrollView>

        <View className="absolute bottom-6 right-5">
          <Fab
            icon="pencil"
            accessibilityLabel="Editar categoría"
            onPress={() =>
              router.push({
                pathname: '/(app)/settings/categories/[id]/edit',
                params: { id: category.id },
              })
            }
          />
        </View>
      </View>

      <ConfirmSheet
        visible={confirmArchive}
        title="¿Archivar categoría?"
        description={
          activeSubcategories.length > 0
            ? `Dejará de aparecer para elegirla en movimientos nuevos. Esto también archivará ${activeSubcategories.length} subcategoría${activeSubcategories.length === 1 ? '' : 's'}: ${activeSubcategories.map((s) => resolveCategoryLabel(s)).join(', ')}. Los movimientos que ya las tienen las conservan. Puedes desarchivar cada una cuando quieras.`
            : 'Dejará de aparecer para elegirla en movimientos nuevos, pero los movimientos que ya la tienen la conservan. Puedes desarchivarla cuando quieras.'
        }
        confirmLabel="Archivar"
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          toggleArchive();
        }}
      />

      <ConfirmSheet
        visible={confirmDelete}
        title="¿Eliminar categoría?"
        description={
          subcategories.length > 0
            ? `Esto también eliminará ${subcategories.length} subcategoría${subcategories.length === 1 ? '' : 's'}: ${subcategories.map((s) => resolveCategoryLabel(s)).join(', ')}. Esta acción no se puede deshacer.`
            : 'Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          removeCategory.mutate(category.id, {
            onSuccess: goBack,
            onError: (e) => setError(e, 'No se pudo eliminar'),
          });
        }}
      />
    </Screen>
  );
}
