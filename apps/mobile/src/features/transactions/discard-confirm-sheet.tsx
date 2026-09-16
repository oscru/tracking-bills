import { BottomSheet, Button } from '@repo/ui';
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
  return (
    <BottomSheet visible={visible} onClose={onKeep} title="¿Descartar movimiento?">
      <View className="gap-3 px-5 pb-4 pt-2">
        <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
          Perderás lo que llevas capturado.
        </Text>
        <Button label="Seguir editando" variant="secondary" onPress={onKeep} />
        <Pressable onPress={onDiscard} className="items-center py-2">
          <Text className="text-sm font-semibold text-danger dark:text-danger-dark">Descartar</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
