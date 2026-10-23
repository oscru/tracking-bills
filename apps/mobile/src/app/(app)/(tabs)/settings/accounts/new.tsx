import { useCreateAccount, useFormError, useProfile } from '@repo/core/hooks';
import { PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { AccountForm } from '../../../../../features/accounts/account-form';

export default function NewAccount() {
  const { t } = useTranslation(['accounts', 'common']);
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
      <PageHeader title={t('new')} onBack={() => router.back()} />

      <AccountForm
        enabledCurrencies={profile.enabled_currencies}
        submitLabel={t('common:save')}
        submitting={create.isPending}
        error={error}
        onDirty={clearError}
        onSubmit={(input) => {
          clearError();
          create.mutate(input, {
            onSuccess: () => router.back(),
            onError: (e) => setError(e, t('saveFailed')),
          });
        }}
      />
    </Screen>
  );
}
