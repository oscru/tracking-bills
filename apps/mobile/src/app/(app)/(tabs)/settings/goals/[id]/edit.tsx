import { useFormError, useGoals, useStableRecord, useUpdateGoal } from '@repo/core/hooks';
import { PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text } from 'react-native';

import { GoalForm } from '../../../../../../features/goals/goal-form';

export default function EditGoal() {
  const { t } = useTranslation(['goals', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: goals, isLoading } = useGoals();
  const update = useUpdateGoal();
  const { error, setError, clearError } = useFormError();

  const goal = useStableRecord((goals ?? []).find((g) => g.id === id));
  const accountsLinkedElsewhere = (goals ?? [])
    .filter((g) => g.id !== id)
    .map((g) => g.account_id)
    .filter((accId): accId is string => accId != null);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!goal) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">{t('notFound')}</Text>
      </Screen>
    );
  }

  return (
    <Screen className="gap-4">
      <PageHeader title={t('edit')} onBack={() => router.back()} />

      <GoalForm
        initial={{
          name: goal.name,
          icon: goal.icon,
          target_amount: Number(goal.target_amount),
          deadline: goal.deadline,
          contribution_amount:
            goal.contribution_amount != null ? Number(goal.contribution_amount) : null,
          contribution_interval_days: goal.contribution_interval_days,
          account_id: goal.account_id,
        }}
        currency={goal.currency}
        accountsLinkedElsewhere={accountsLinkedElsewhere}
        submitLabel={t('common:saveChanges')}
        submitting={update.isPending}
        error={error}
        onDirty={clearError}
        onSubmit={(input) => {
          clearError();
          update.mutate(
            { id: goal.id, patch: input },
            {
              onSuccess: () => router.back(),
              onError: (e) => setError(e, t('common:saveChangesFailed')),
            },
          );
        }}
      />
    </Screen>
  );
}
