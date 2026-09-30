import { useAccounts, useFormError, useGoals, useProfile, useUpdateGoal } from '@repo/core/hooks';
import { PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native';

import { GoalForm } from '../../../../../../features/goals/goal-form';

export default function EditGoal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const { data: profile } = useProfile();
  const { data: goals, isLoading } = useGoals();
  const update = useUpdateGoal();
  const { error, setError, clearError } = useFormError();
  const currency = profile?.currency ?? accounts?.[0]?.currency ?? 'MXN';

  const goal = (goals ?? []).find((g) => g.id === id);

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
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Objetivo no encontrado.</Text>
      </Screen>
    );
  }

  return (
    <Screen className="gap-4">
      <PageHeader title="Editar objetivo" onBack={() => router.back()} />

      <GoalForm
        initial={{
          name: goal.name,
          icon: goal.icon,
          target_amount: Number(goal.target_amount),
          deadline: goal.deadline,
          contribution_amount: goal.contribution_amount != null ? Number(goal.contribution_amount) : null,
          contribution_interval_days: goal.contribution_interval_days,
        }}
        currency={currency}
        submitLabel="Guardar cambios"
        submitting={update.isPending}
        error={error}
        onDirty={clearError}
        onSubmit={(input) => {
          clearError();
          update.mutate(
            { id: goal.id, patch: input },
            {
              onSuccess: () => router.back(),
              onError: (e) => setError(e, 'No se pudieron guardar los cambios'),
            },
          );
        }}
      />
    </Screen>
  );
}
