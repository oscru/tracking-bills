import { useCreateCategory, useFormError } from '@repo/core/hooks';
import { Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { CategoryForm } from '../../../../../features/categories/category-form';

export default function NewCategory() {
  const router = useRouter();
  const create = useCreateCategory();
  const { error, setError, clearError } = useFormError();

  return (
    <Screen className="gap-4">
      <View className="flex-row items-center justify-between pt-2">
        <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Nueva categoría</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">Cancelar</Text>
        </Pressable>
      </View>

      <CategoryForm
        submitLabel="Guardar"
        submitting={create.isPending}
        error={error}
        onDirty={clearError}
        onSubmit={(input) => {
          clearError();
          create.mutate(input, {
            onSuccess: () => router.back(),
            onError: (e) => setError(e, 'No se pudo guardar la categoría'),
          });
        }}
      />
    </Screen>
  );
}
