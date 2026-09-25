import { useCategories, useFormError, useUpdateCategory } from '@repo/core/hooks';
import { PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native';

import { CategoryForm } from '../../../../../../features/categories/category-form';

export default function EditCategory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: categories, isLoading } = useCategories();
  const update = useUpdateCategory();
  const { error, setError, clearError } = useFormError();

  const category = (categories ?? []).find((c) => c.id === id);

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
        onDirty={clearError}
        onSubmit={(input) => {
          clearError();
          update.mutate(
            { id, patch: input },
            {
              onSuccess: () => router.back(),
              onError: (e) => setError(e, 'No se pudieron guardar los cambios'),
            },
          );
        }}
      />
    </Screen>
  );
}
