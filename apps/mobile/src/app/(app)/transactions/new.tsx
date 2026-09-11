import { useCreateTransaction } from '@repo/core/hooks';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { MovementForm } from '../../../features/transactions/movement-form';

export default function NewTransaction() {
  const router = useRouter();
  const create = useCreateTransaction();
  const [error, setError] = useState<string | null>(null);

  return (
    <MovementForm
      mode="create"
      submitting={create.isPending}
      error={error}
      onCancel={() => router.back()}
      onSubmit={(input) => {
        setError(null);
        create.mutate(input, {
          onSuccess: () => router.back(),
          onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar'),
        });
      }}
    />
  );
}
