import { useCreateTransaction, useFormError, useSetTransactionTags } from '@repo/core/hooks';
import type { TransactionCreateInput } from '@repo/core/validators';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { draftTransactionStore } from '../../features/transactions/draft-transaction-store';
import { MovementForm } from '../../features/transactions/movement-form';

export default function NewTransaction() {
  const router = useRouter();
  const create = useCreateTransaction();
  const setTags = useSetTransactionTags();
  const { error, setError, clearError } = useFormError();

  // Freeze whatever draft existed at mount time — the store may change
  // afterwards (e.g. get cleared on unmount), but that shouldn't reset the form.
  const [draft] = useState(() => draftTransactionStore.getState().snapshot);

  useEffect(() => {
    draftTransactionStore.restore();
    return () => {
      // Left without minimizing (saved, cancelled, or the hardware back
      // button) — don't leave a stale draft behind for next time.
      if (!draftTransactionStore.getState().minimized) {
        draftTransactionStore.clear();
      }
    };
  }, []);

  const submit = (input: TransactionCreateInput, tagIds: string[]) => {
    clearError();
    const done = () => {
      draftTransactionStore.clear();
      router.back();
    };
    create.mutate(input, {
      onSuccess: (transaction) => {
        if (tagIds.length === 0) return done();
        setTags.mutate(
          { transactionId: transaction.id, tagIds },
          { onSuccess: done, onError: () => done() },
        );
      },
      onError: (e) => setError(e, 'No se pudo guardar'),
    });
  };

  return (
    <MovementForm
      mode="create"
      submitting={create.isPending || setTags.isPending}
      error={error}
      draft={draft}
      onMinimize={(next) => {
        draftTransactionStore.minimize(next);
        router.back();
      }}
      onCancel={() => router.back()}
      onSubmit={submit}
    />
  );
}
