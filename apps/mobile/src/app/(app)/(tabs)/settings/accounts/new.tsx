import { useCreateAccount } from '@repo/core/hooks';
import { PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AccountForm } from '../../../../../features/accounts/account-form';

export default function NewAccount() {
  const router = useRouter();
  const create = useCreateAccount();
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen className="gap-4">
      <PageHeader title="Nueva cuenta" onBack={() => router.back()} />

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
