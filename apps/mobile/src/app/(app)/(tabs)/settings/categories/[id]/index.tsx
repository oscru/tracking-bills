import { useCategories, useUpdateCategory } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import { Button, CategoryDot, ConfirmSheet, Fab, PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CategoryDetailSkeleton } from '../../../../../../features/categories/category-detail-skeleton';
import { CategoryHistoryChart } from '../../../../../../features/categories/category-history-chart';

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
  const updateCategory = useUpdateCategory();
  const [confirmArchive, setConfirmArchive] = useState(false);

  const category = (categories ?? []).find((c) => c.id === id);
  const subcategories = (categories ?? []).filter((c) => c.parent_id === id);

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

          <View className="border-t border-line pt-5 dark:border-line-dark">
            <Button
              label={category.archived ? 'Desarchivar' : 'Archivar'}
              variant={category.archived ? 'secondary' : 'ghost-danger'}
              loading={updateCategory.isPending}
              onPress={() => (category.archived ? toggleArchive() : setConfirmArchive(true))}
            />
          </View>
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
        description="Dejará de aparecer para elegirla en movimientos nuevos, pero los movimientos que ya la tienen la conservan. Puedes desarchivarla cuando quieras."
        confirmLabel="Archivar"
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          toggleArchive();
        }}
      />
    </Screen>
  );
}
