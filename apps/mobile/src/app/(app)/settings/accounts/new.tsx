import { useCreateAccount } from '@repo/core/hooks';
import { Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AccountForm } from '../../../../features/accounts/account-form';

export default function NewAccount() {
  const router = useRouter();
  const create = useCreateAccount();
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen className="gap-4">
      <View className="flex-row items-center justify-between pt-2">
        <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Nueva cuenta</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">Cancelar</Text>
        </Pressable>
      </View>

      <AccountForm
        submitLabel="Guardar"
        submitting={create.isPending}
        error={error}
        onSubmit={(input) => {
          setError(null);
          create.mutate(input, {
            onSuccess: () => router.back(),
            onError: (e) =>
              setError(e instanceof Error ? e.message : 'No se pudo guardar la cuenta'),
          });
        }}
      />
    </Screen>
  );
}
