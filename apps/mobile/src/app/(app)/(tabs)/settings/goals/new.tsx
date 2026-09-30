import { useAccounts, useCreateGoal, useFormError, useProfile } from '@repo/core/hooks';
import { PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';

import { GoalForm } from '../../../../../features/goals/goal-form';

export default function NewGoal() {
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const { data: profile } = useProfile();
  const create = useCreateGoal();
  const { error, setError, clearError } = useFormError();
  const currency = profile?.currency ?? accounts?.[0]?.currency ?? 'MXN';

  return (
    <Screen className="gap-4">
      <PageHeader title="Nuevo objetivo" onBack={() => router.back()} />

      <GoalForm
        currency={currency}
        submitLabel="Guardar"
        submitting={create.isPending}
        error={error}
        onDirty={clearError}
        onSubmit={(input) => {
          clearError();
          create.mutate(input, {
            onSuccess: () => router.back(),
            onError: (e) => setError(e, 'No se pudo guardar el objetivo'),
          });
        }}
      />
    </Screen>
  );
}
