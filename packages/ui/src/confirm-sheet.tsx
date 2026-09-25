import { Pressable, Text, View } from 'react-native';

import { BottomSheet } from './bottom-sheet';
import { Button } from './button';

export interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Style the confirm action as a quiet danger link (default) instead of a neutral one. */
  destructive?: boolean;
}

/**
 * A confirmation bottom sheet: the safe option is the prominent button, the
 * one being confirmed is a quiet text link underneath — same asymmetry as
 * "Seguir editando" / "Descartar" on discarding a movement.
 */
export function ConfirmSheet({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onCancel,
  onConfirm,
  destructive = true,
}: ConfirmSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onCancel} title={title}>
      <View className="gap-3 px-5 pb-4 pt-2">
        <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{description}</Text>
        <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
        <Pressable onPress={onConfirm} className="items-center py-2">
          <Text
            className={`text-sm font-semibold ${
              destructive ? 'text-danger dark:text-danger-dark' : 'text-ink-2 dark:text-ink-2-dark'
            }`}
          >
            {confirmLabel}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
