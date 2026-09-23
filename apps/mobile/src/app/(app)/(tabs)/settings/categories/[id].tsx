import { useCategories, useDeleteCategory, useUpdateCategory } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import { Button, PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { CategoryForm } from '../../../../../features/categories/category-form';

export default function EditCategory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: categories, isLoading } = useCategories();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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

  return (
    <Screen className="gap-4">
      <PageHeader title="Editar categoría" onBack={() => router.back()} />

      <CategoryForm
        initial={{
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          parent_id: category.parent_id,
        }}
        submitLabel="Guardar cambios"
        submitting={update.isPending}
        error={error}
        onSubmit={(input) => {
          setError(null);
          update.mutate(
            { id, patch: input },
            {
              onSuccess: () => router.back(),
              onError: (e) =>
                setError(e instanceof Error ? e.message : 'No se pudieron guardar los cambios'),
            },
          );
        }}
        footer={
          <View className="gap-5">
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
                        </Text>
                        <Text className="text-lg text-ink-3 dark:text-ink-3-dark">›</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {confirming ? (
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label="Conservar"
                    variant="secondary"
                    onPress={() => setConfirming(false)}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Eliminar"
                    loading={remove.isPending}
                    onPress={() =>
                      remove.mutate(id, {
                        onSuccess: () => router.back(),
                        onError: (e) =>
                          setError(e instanceof Error ? e.message : 'No se pudo eliminar'),
                      })
                    }
                  />
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setConfirming(true)} className="items-center py-2">
                <Text className="text-sm font-medium text-danger dark:text-danger-dark">
                  Eliminar categoría
                </Text>
              </Pressable>
            )}
          </View>
        }
      />
    </Screen>
  );
}
