import { useCategories, useUpdateCategory } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import { Button, ConfirmSheet, Fab, PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CategoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: categories, isLoading } = useCategories();
  const updateCategory = useUpdateCategory();
  const [confirmArchive, setConfirmArchive] = useState(false);

  const category = (categories ?? []).find((c) => c.id === id);
  const subcategories = (categories ?? []).filter((c) => c.parent_id === id);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!category) {
    return (
      <Screen className="gap-4">
        <PageHeader title="Categoría" onBack={() => router.back()} />
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Categoría no encontrada.</Text>
      </Screen>
    );
  }

  const toggleArchive = () =>
    updateCategory.mutate({ id: category.id, patch: { archived: !category.archived } });

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader title={resolveCategoryLabel(category)} onBack={() => router.back()} />

      <View className="flex-1 gap-5">
        <View className="flex-row items-center gap-2">
          <View
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: category.color ?? '#94A3B8' }}
          />
          <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
            {category.type === 'income' ? 'Ingreso' : 'Gasto'}
            {category.archived ? ' · archivada' : ''}
          </Text>
        </View>

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
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.color ?? '#94A3B8' }}
                    />
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

      <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <Button
          label={category.archived ? 'Desarchivar' : 'Archivar'}
          variant={category.archived ? 'secondary' : 'ghost-danger'}
          loading={updateCategory.isPending}
          onPress={() => (category.archived ? toggleArchive() : setConfirmArchive(true))}
        />
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
