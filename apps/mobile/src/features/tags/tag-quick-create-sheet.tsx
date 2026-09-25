import { useCreateTag, useFormError } from '@repo/core/hooks';
import { BottomSheet } from '@repo/ui';
import { View } from 'react-native';

import { TagForm } from './tag-form';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called with the new tag's id right after it's created. */
  onCreated: (id: string) => void;
}

/** Lets the user create a tag inline (e.g. from the transaction form) without navigating away. */
export function TagQuickCreateSheet({ visible, onClose, onCreated }: Props) {
  const create = useCreateTag();
  const { error, setError, clearError } = useFormError();

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Nueva tag">
      <View className="px-5 pt-1">
        <TagForm
          key={visible ? 'open' : 'closed'}
          submitLabel="Crear"
          submitting={create.isPending}
          error={error}
          onDirty={clearError}
          onSubmit={(input) => {
            clearError();
            create.mutate(input, {
              onSuccess: (tag) => {
                onCreated(tag.id);
              },
              onError: (e) => setError(e, 'No se pudo crear la tag'),
            });
          }}
        />
      </View>
    </BottomSheet>
  );
}
