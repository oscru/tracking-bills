import { useCreateAccount, useFormError, useProfile } from '@repo/core/hooks';
import { PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { AccountForm } from '../../../../../features/accounts/account-form';

export default function NewAccount() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const create = useCreateAccount();
  const { error, setError, clearError } = useFormError();

  if (isLoading || !profile) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen className="gap-4">
      <PageHeader title="Nueva cuenta" onBack={() => router.back()} />

      <AccountForm
        enabledCurrencies={profile.enabled_currencies}
        submitLabel="Guardar"
        submitting={create.isPending}
        error={error}
        onDirty={clearError}
        onSubmit={(input) => {
          clearError();
          create.mutate(input, {
            onSuccess: () => router.back(),
            onError: (e) => setError(e, 'No se pudo guardar la cuenta'),
          });
        }}
      />
    </Screen>
  );
}
