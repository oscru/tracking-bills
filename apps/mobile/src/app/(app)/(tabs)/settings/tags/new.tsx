import { useCreateTag, useFormError } from '@repo/core/hooks';
import { PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';

import { TagForm } from '../../../../../features/tags/tag-form';

export default function NewTag() {
  const router = useRouter();
  const create = useCreateTag();
  const { error, setError, clearError } = useFormError();

  return (
    <Screen className="gap-4">
      <PageHeader title="Nueva tag" onBack={() => router.back()} />

      <TagForm
        submitLabel="Guardar"
        submitting={create.isPending}
        error={error}
        onDirty={clearError}
        onSubmit={(input) => {
          clearError();
          create.mutate(input, {
            onSuccess: () => router.back(),
            onError: (e) => setError(e, 'No se pudo guardar la tag'),
          });
        }}
      />
    </Screen>
  );
}
