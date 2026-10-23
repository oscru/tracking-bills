import { useCreateCategory, useFormError } from '@repo/core/hooks';
import type { CategoryType } from '@repo/core/types';
import { BottomSheet } from '@repo/ui';
import { useTranslation } from 'react-i18next';
import { View, useWindowDimensions } from 'react-native';

import { CategoryForm } from './category-form';

interface Props {
  visible: boolean;
  onClose: () => void;
  type: CategoryType;
  /** Called with the new category's id right after it's created. */
  onCreated: (id: string) => void;
  /** Prefills the name — e.g. what the user had typed in the picker's search. */
  initialName?: string;
}

/** Lets the user create a category inline (e.g. from the transaction form) without navigating away. */
export function CategoryQuickCreateSheet({
  visible,
  onClose,
  type,
  onCreated,
  initialName,
}: Props) {
  const { t } = useTranslation(['categories', 'common']);
  const { height: windowHeight } = useWindowDimensions();
  const create = useCreateCategory();
  const { error, setError, clearError } = useFormError();

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('new')}>
      {/* A fixed height, not just a max: the form is a flex-1 ScrollView, which
      collapsed to nothing inside a container with no height of its own —
      the sheet opened showing only its title. */}
      <View style={{ height: windowHeight * 0.7 }} className="px-5 pt-1">
        <CategoryForm
          // Remounts per open (and per prefilled name) so it starts fresh.
          key={visible ? `open-${initialName ?? ''}` : 'closed'}
          initial={{ type, name: initialName }}
          submitLabel={t('common:create')}
          submitting={create.isPending}
          error={error}
          onDirty={clearError}
          onSubmit={(input) => {
            clearError();
            create.mutate(input, {
              onSuccess: (category) => {
                onCreated(category.id);
              },
              onError: (e) => setError(e, t('createFailed')),
            });
          }}
        />
      </View>
    </BottomSheet>
  );
}
