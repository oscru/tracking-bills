import { useCreateTag, useFormError } from '@repo/core/hooks';
import { BottomSheet } from '@repo/ui';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { TagForm } from './tag-form';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called with the new tag's id right after it's created. */
  onCreated: (id: string) => void;
  /** Prefills the name — e.g. what the user had typed in the tag search. */
  initialName?: string;
}

/** Lets the user create a tag inline (e.g. from the transaction form) without navigating away. */
export function TagQuickCreateSheet({ visible, onClose, onCreated, initialName }: Props) {
  const { t } = useTranslation(['tags', 'common']);
  const create = useCreateTag();
  const { error, setError, clearError } = useFormError();

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('new')}>
      <View className="px-5 pt-1">
        <TagForm
          key={visible ? `open-${initialName ?? ''}` : 'closed'}
          initial={initialName ? { name: initialName } : undefined}
          submitLabel={t('common:create')}
          submitting={create.isPending}
          error={error}
          onDirty={clearError}
          onSubmit={(input) => {
            clearError();
            create.mutate(input, {
              onSuccess: (tag) => {
                onCreated(tag.id);
              },
              onError: (e) => setError(e, t('createFailed')),
            });
          }}
        />
      </View>
    </BottomSheet>
  );
}
