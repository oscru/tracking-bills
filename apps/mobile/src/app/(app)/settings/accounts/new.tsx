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
        <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Nueva cuenta
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">Cancelar</Text>
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
