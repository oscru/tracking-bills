import { useCategories, useFormError, useStableRecord, useUpdateCategory } from '@repo/core/hooks';
import { PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text } from 'react-native';

import { CategoryForm } from '../../../../../../features/categories/category-form';

export default function EditCategory() {
  const { t } = useTranslation(['categories', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: categories, isLoading } = useCategories();
  const update = useUpdateCategory();
  const { error, setError, clearError } = useFormError();

  const category = useStableRecord((categories ?? []).find((c) => c.id === id));

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!category) {
    return (
      <Screen className="gap-4">
        <PageHeader title={t('category')} onBack={() => router.back()} />
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">{t('notFound')}</Text>
      </Screen>
    );
  }

  return (
    <Screen className="gap-4">
      <PageHeader title={t('edit')} onBack={() => router.back()} />

      <CategoryForm
        initial={{
          id: category.id,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          parent_id: category.parent_id,
        }}
        submitLabel={t('common:saveChanges')}
        submitting={update.isPending}
        error={error}
        onDirty={clearError}
        onSubmit={(input) => {
          clearError();
          update.mutate(
            { id, patch: input },
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
