import { useCreateTransaction } from '@repo/core/hooks';
import type { TransactionCreateInput } from '@repo/core/validators';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { draftTransactionStore } from '../../features/transactions/draft-transaction-store';
import { MovementForm } from '../../features/transactions/movement-form';

export default function NewTransaction() {
  const router = useRouter();
  const create = useCreateTransaction();
  const [error, setError] = useState<string | null>(null);

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

  const submit = (input: TransactionCreateInput) => {
    setError(null);
    create.mutate(input, {
      onSuccess: () => {
        draftTransactionStore.clear();
        router.back();
      },
      onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar'),
    });
  };

  return (
    <MovementForm
      mode="create"
      submitting={create.isPending}
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
