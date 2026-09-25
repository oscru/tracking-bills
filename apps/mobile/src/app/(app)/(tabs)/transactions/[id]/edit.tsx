import {
  useDeleteTransaction,
  useFormError,
  useSetTransactionTags,
  useTransaction,
  useUpdateTransaction,
} from '@repo/core/hooks';
import { Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native';

import { MovementForm } from '../../../../../features/transactions/movement-form';

export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: tx, isLoading } = useTransaction(id);
  const update = useUpdateTransaction();
  const setTags = useSetTransactionTags();
  const remove = useDeleteTransaction();
  const { error, setError, clearError } = useFormError();

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
        tags: tx.tags.map((t) => t.id),
        description: tx.description,
        transaction_date: tx.transaction_date,
        is_completed: tx.is_completed,
      }}
      submitting={update.isPending || setTags.isPending}
      error={error}
      onCancel={() => router.back()}
      onSubmit={(input, tagIds) => {
        clearError();
        update.mutate(
          { id, patch: input },
          {
            onSuccess: () => {
              setTags.mutate(
                { transactionId: id, tagIds },
                { onSuccess: () => router.back(), onError: () => router.back() },
              );
            },
            onError: (e) => setError(e, 'No se pudo guardar'),
          },
        );
      }}
      onDelete={() =>
        remove.mutate(id, {
          onSuccess: () => router.back(),
          onError: (e) => setError(e, 'No se pudo eliminar'),
        })
      }
    />
  );
}
