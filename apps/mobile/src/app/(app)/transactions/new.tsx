import { useCreateTransaction } from '@repo/core/hooks';
import { Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { TransactionForm } from '../../../features/transactions/transaction-form';

export default function NewTransaction() {
  const router = useRouter();
  const create = useCreateTransaction();
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen className="gap-4">
      <View className="flex-row items-center justify-between pt-2">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          New transaction
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">Cancel</Text>
        </Pressable>
      </View>

      <TransactionForm
        submitLabel="Save"
        submitting={create.isPending}
        error={error}
        onSubmit={(input) => {
          setError(null);
          create.mutate(input, {
            onSuccess: () => router.back(),
            onError: (e) =>
              setError(e instanceof Error ? e.message : 'Could not save the transaction'),
          });
        }}
      />
    </Screen>
  );
}
