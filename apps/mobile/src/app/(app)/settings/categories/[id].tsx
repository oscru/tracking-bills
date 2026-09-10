import { useCategories, useDeleteCategory, useUpdateCategory } from '@repo/core/hooks';
import { Button, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { CategoryForm } from '../../../../features/categories/category-form';

export default function EditCategory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: categories, isLoading } = useCategories();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const category = (categories ?? []).find((c) => c.id === id);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!category || category.is_default) {
    return (
      <Screen center>
        <Text className="text-base text-neutral-500 dark:text-neutral-400">
          Categoría no editable.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen className="gap-4">
      <View className="flex-row items-center justify-between pt-2">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Editar categoría
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">Cancelar</Text>
        </Pressable>
      </View>

      <CategoryForm
        initial={{ name: category.name, type: category.type, color: category.color }}
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
          confirming ? (
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
              <Text className="text-sm font-medium text-red-500">Eliminar categoría</Text>
            </Pressable>
          )
        }
      />
    </Screen>
  );
}
