import { useCreateTag, useFormError } from '@repo/core/hooks';
import { PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';

import { TagForm } from '../../../../../features/tags/tag-form';
import { useTranslation } from 'react-i18next';

export default function NewTag() {
  const { t } = useTranslation(['tags', 'common']);
  const router = useRouter();
  const create = useCreateTag();
  const { error, setError, clearError } = useFormError();

  return (
    <Screen className="gap-4">
      <PageHeader title={t('new')} onBack={() => router.back()} />

      <TagForm
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
