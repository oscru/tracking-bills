import { useDeleteTransaction, useTransaction, useUpdateTransaction } from '@repo/core/hooks';
import { Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';

import { MovementForm } from '../../../features/transactions/movement-form';

export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: tx, isLoading } = useTransaction(id);
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const [error, setError] = useState<string | null>(null);

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
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Movimiento no encontrado.</Text>
      </Screen>
    );
  }

  return (
    <MovementForm
      mode="edit"
      initial={{
        type: tx.type,
        amount: tx.amount,
        account_id: tx.account_id,
        to_account_id: tx.to_account_id,
        category_id: tx.category_id,
        description: tx.description,
        transaction_date: tx.transaction_date,
        is_completed: tx.is_completed,
      }}
      submitting={update.isPending}
      error={error}
      onCancel={() => router.back()}
      onSubmit={(input) => {
        setError(null);
        update.mutate(
          { id, patch: input },
          {
            onSuccess: () => router.back(),
            onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar'),
          },
        );
      }}
      onDelete={() =>
        remove.mutate(id, {
          onSuccess: () => router.back(),
          onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo eliminar'),
        })
      }
    />
  );
}
