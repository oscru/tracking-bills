import { BottomSheet, Button } from '@repo/ui';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

/** Confirmation before discarding an in-progress movement — the form itself or its floating bubble. */
export function DiscardConfirmSheet({
  visible,
  onKeep,
  onDiscard,
}: {
  visible: boolean;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  const { t } = useTranslation(['transactions', 'common']);
  return (
    <BottomSheet visible={visible} onClose={onKeep} title={t('discard.title')}>
      <View className="gap-3 px-5 pb-4 pt-2">
        <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{t('discard.body')}</Text>
        <Button label={t('discard.keepEditing')} variant="secondary" onPress={onKeep} />
        <Pressable onPress={onDiscard} className="items-center py-2">
          <Text className="text-sm font-semibold text-danger dark:text-danger-dark">
            {t('common:discard')}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
