import { useCreateCategory, useFormError } from '@repo/core/hooks';
import type { CategoryType } from '@repo/core/types';
import { BottomSheet } from '@repo/ui';
import { View, useWindowDimensions } from 'react-native';

import { CategoryForm } from './category-form';

interface Props {
  visible: boolean;
  onClose: () => void;
  type: CategoryType;
  /** Called with the new category's id right after it's created. */
  onCreated: (id: string) => void;
}

/** Lets the user create a category inline (e.g. from the transaction form) without navigating away. */
export function CategoryQuickCreateSheet({ visible, onClose, type, onCreated }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const create = useCreateCategory();
  const { error, setError, clearError } = useFormError();

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Nueva categoría">
      <View style={{ maxHeight: windowHeight * 0.7 }} className="px-5 pt-1">
        <CategoryForm
          key={visible ? 'open' : 'closed'}
          initial={{ type }}
          submitLabel="Crear"
          submitting={create.isPending}
          error={error}
          onDirty={clearError}
          onSubmit={(input) => {
            clearError();
            create.mutate(input, {
              onSuccess: (category) => {
                onCreated(category.id);
              },
              onError: (e) => setError(e, 'No se pudo crear la categoría'),
            });
          }}
        />
      </View>
    </BottomSheet>
  );
}
