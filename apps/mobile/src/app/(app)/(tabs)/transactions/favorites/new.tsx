import { useCreateFavoriteTransaction, useFormError } from '@repo/core/hooks';
import type { TransactionType } from '@repo/core/types';
import { PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  FavoriteForm,
  type FavoriteFormInitial,
} from '../../../../../features/favorites/favorite-form';
import { useTranslation } from 'react-i18next';

export default function NewFavorite() {
  const { t } = useTranslation(['favorites', 'common']);
  const router = useRouter();
  const create = useCreateFavoriteTransaction();
  const { error, setError, clearError } = useFormError();
  // Set only when opened from a transaction's own "Guardar como favorito"
  // action — prefills everything but the name/icon, which that transaction
  // doesn't carry.
  const params = useLocalSearchParams<{
    type?: TransactionType;
    accountId?: string;
    toAccountId?: string;
    categoryId?: string;
    description?: string;
  }>();

  const initial: FavoriteFormInitial | undefined = params.accountId
    ? {
        type: params.type,
        account_id: params.accountId,
        to_account_id: params.toAccountId ?? null,
        category_id: params.categoryId ?? null,
        description: params.description ?? null,
      }
    : undefined;

  return (
    <Screen className="gap-4">
      <PageHeader title={t('new')} onBack={() => router.back()} />

      <FavoriteForm
        initial={initial}
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
