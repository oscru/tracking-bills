import { useCreateGoal, useFormError, useGoals, useProfile } from '@repo/core/hooks';
import { PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { GoalForm } from '../../../../../features/goals/goal-form';

export default function NewGoal() {
  const { t } = useTranslation(['goals', 'common']);
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const { data: goals } = useGoals();
  const create = useCreateGoal();
  const accountsLinkedElsewhere = (goals ?? [])
    .map((g) => g.account_id)
    .filter((id): id is string => id != null);
  const { error, setError, clearError } = useFormError();
  // Seeded from the profile once it loads, then lives independently so the
  // chip selection doesn't get clobbered by a later refetch.
  const [currency, setCurrency] = useState<string | null>(null);

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

      <GoalForm
        currency={currency ?? profile.currency}
        currencyOptions={profile.enabled_currencies}
        onChangeCurrency={setCurrency}
        accountsLinkedElsewhere={accountsLinkedElsewhere}
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
