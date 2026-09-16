import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Right-aligned header action (e.g. a "+ New" link). */
  headerAction?: ReactNode;
  children: ReactNode;
}

export function BottomSheet({ visible, onClose, title, headerAction, children }: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Cerrar" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView
            edges={['bottom']}
            className="max-h-[88%] rounded-t-[24px] bg-surface dark:bg-surface-dark"
          >
            <View className="items-center py-2.5">
              <View className="h-1 w-10 rounded-full bg-[#E3E5E8] dark:bg-line-dark" />
            </View>
            {(title || headerAction) && (
              <View className="flex-row items-center justify-between px-5 pb-2">
                <Text className="text-[17px] font-bold text-ink dark:text-ink-dark">{title}</Text>
                {headerAction}
              </View>
            )}
            {children}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
