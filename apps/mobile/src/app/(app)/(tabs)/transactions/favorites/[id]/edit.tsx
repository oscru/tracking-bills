import {
  useDeleteFavoriteTransaction,
  useFavoriteTransactions,
  useFormError,
  useUpdateFavoriteTransaction,
} from '@repo/core/hooks';
import { Button, PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { FavoriteForm } from '../../../../../../features/favorites/favorite-form';

export default function EditFavorite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: favorites, isLoading } = useFavoriteTransactions();
  const update = useUpdateFavoriteTransaction();
  const remove = useDeleteFavoriteTransaction();
  const { error, setError, clearError } = useFormError();
  const [confirming, setConfirming] = useState(false);

  const favorite = (favorites ?? []).find((f) => f.id === id);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!favorite) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Favorito no encontrado.</Text>
      </Screen>
    );
  }

  return (
    <Screen className="gap-4">
      <PageHeader title="Editar favorito" onBack={() => router.back()} />

      <FavoriteForm
        initial={{
          label: favorite.label,
          icon: favorite.icon,
          type: favorite.type,
          account_id: favorite.account_id,
          to_account_id: favorite.to_account_id,
          category_id: favorite.category_id,
          amount: favorite.amount,
          description: favorite.description,
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
                        onSuccess: () => router.back(),
                        onError: (e) => setError(e, 'No se pudo eliminar'),
                      })
                    }
                  />
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setConfirming(true)} className="items-center py-2">
                <Text className="text-sm font-medium text-danger dark:text-danger-dark">
                  Eliminar favorito
                </Text>
              </Pressable>
            )}
          </View>
        }
      />
    </Screen>
  );
}
