import { useAccounts, useDeleteAccount, useUpdateAccount } from '@repo/core/hooks';
import { Button, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AccountForm } from '../../../../../../features/accounts/account-form';

export default function EditAccount() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: accounts, isLoading } = useAccounts();
  const update = useUpdateAccount();
  const remove = useDeleteAccount();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const account = (accounts ?? []).find((a) => a.id === id);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!account) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Cuenta no encontrada.</Text>
      </Screen>
    );
  }

  return (
    <Screen className="gap-4">
      <View className="flex-row items-center justify-between pt-2">
        <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Editar cuenta</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">Cancelar</Text>
        </Pressable>
      </View>

      <AccountForm
        initial={{
          name: account.name,
          type: account.type,
          currency: account.currency,
          initial_balance: Number(account.initial_balance),
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
          <View className="gap-3">
            <Button
              label={account.archived ? 'Desarchivar' : 'Archivar'}
              variant="secondary"
              loading={update.isPending}
              onPress={() => update.mutate({ id, patch: { archived: !account.archived } })}
            />

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
                        onSuccess: () => router.replace('/(app)/settings/accounts'),
                        onError: (e) =>
                          setError(
                            e instanceof Error
                              ? 'No se puede eliminar: la cuenta tiene movimientos. Archívala.'
                              : 'No se pudo eliminar',
                          ),
                      })
                    }
                  />
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setConfirming(true)} className="items-center py-2">
                <Text className="text-sm font-medium text-danger dark:text-danger-dark">
                  Eliminar cuenta
                </Text>
              </Pressable>
            )}
          </View>
        }
      />
    </Screen>
  );
}
