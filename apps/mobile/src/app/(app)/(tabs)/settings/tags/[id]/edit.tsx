import { useDeleteTag, useFormError, useTags, useUpdateTag } from '@repo/core/hooks';
import { Button, PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { TagForm } from '../../../../../../features/tags/tag-form';

export default function EditTag() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: tags, isLoading } = useTags();
  const update = useUpdateTag();
  const remove = useDeleteTag();
  const { error, setError, clearError } = useFormError();
  const [confirming, setConfirming] = useState(false);

  const tag = (tags ?? []).find((t) => t.id === id);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!tag) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Tag no encontrada.</Text>
      </Screen>
    );
  }

  return (
    <Screen className="gap-4">
      <PageHeader title="Editar tag" onBack={() => router.back()} />

      <TagForm
        initial={{ name: tag.name, color: tag.color }}
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
        footer={
          <View className="gap-3">
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
                        onSuccess: () => router.replace('/(app)/settings/tags'),
                        onError: (e) => setError(e, 'No se pudo eliminar'),
                      })
                    }
                  />
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setConfirming(true)} className="items-center py-2">
                <Text className="text-sm font-medium text-danger dark:text-danger-dark">
                  Eliminar tag
                </Text>
              </Pressable>
            )}
          </View>
        }
      />
    </Screen>
  );
}
