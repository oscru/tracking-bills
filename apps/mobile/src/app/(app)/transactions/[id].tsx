import { useDeleteTransaction, useTransaction, useUpdateTransaction } from '@repo/core/hooks';
import { Button, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { TransactionForm } from '../../../features/transactions/transaction-form';

export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: tx, isLoading } = useTransaction(id);
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!tx) {
    return (
      <Screen center>
        <Text className="text-base text-neutral-500 dark:text-neutral-400">
          Transaction not found.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen className="gap-4">
      <View className="flex-row items-center justify-between pt-2">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Edit transaction
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">Cancel</Text>
        </Pressable>
      </View>

      <TransactionForm
        initial={{
          type: tx.type,
          amount: tx.amount,
          account_id: tx.account_id,
          category_id: tx.category_id,
          description: tx.description,
          transaction_date: tx.transaction_date,
        }}
        submitLabel="Save changes"
        submitting={update.isPending}
        error={error}
        onSubmit={(input) => {
          setError(null);
          update.mutate(
            { id, patch: input },
            {
              onSuccess: () => router.back(),
              onError: (e) => setError(e instanceof Error ? e.message : 'Could not save changes'),
            },
          );
        }}
        footer={
          confirming ? (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label="Keep" variant="secondary" onPress={() => setConfirming(false)} />
              </View>
              <View className="flex-1">
                <Button
                  label="Delete"
                  loading={remove.isPending}
                  onPress={() =>
                    remove.mutate(id, {
                      onSuccess: () => router.back(),
                      onError: (e) => setError(e instanceof Error ? e.message : 'Could not delete'),
                    })
                  }
                />
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setConfirming(true)} className="items-center py-2">
              <Text className="text-sm font-medium text-red-500">Delete transaction</Text>
            </Pressable>
          )
        }
      />
    </Screen>
  );
}
