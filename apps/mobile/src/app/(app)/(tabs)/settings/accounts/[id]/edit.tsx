import { useAccounts, useDeleteAccount, useFormError, useUpdateAccount } from '@repo/core/hooks';
import { Button, PageHeader, Screen } from '@repo/ui';
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
  const { error, setError, clearError } = useFormError();
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
      <PageHeader title="Editar cuenta" onBack={() => router.back()} />

      <AccountForm
        initial={{
          name: account.name,
          type: account.type,
          currency: account.currency,
          initial_balance: Number(account.initial_balance),
          color: account.color,
        }}
        enabledCurrencies={[account.currency]}
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
                        onSuccess: () => router.replace('/(app)/settings/accounts'),
                        onError: (e) => setError(e, 'No se pudo eliminar'),
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
