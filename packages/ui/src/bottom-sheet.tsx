import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSheetPortalRegister } from './sheet-portal';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Right-aligned header action (e.g. a "+ New" link). */
  headerAction?: ReactNode;
  children: ReactNode;
}

const OFFSCREEN_Y = 600;

function SheetBody({ onClose, title, headerAction, children }: Omit<BottomSheetProps, 'visible'>) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Pressable
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        onPress={onClose}
        accessibilityLabel="Cerrar"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View
          style={{ paddingBottom: insets.bottom + 16 }}
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
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

/**
 * Slides up from the bottom. Portals into `<SheetPortalHost>` (mounted at the
 * app root) instead of using RN's `Modal` — on Android, a `Modal` opens a
 * separate native window that can end up rendering behind the app's own tab
 * bar; portaling into the same view tree as the rest of the app avoids that.
 */
export function BottomSheet({ visible, onClose, title, headerAction, children }: BottomSheetProps) {
  const id = useId();
  const register = useSheetPortalRegister();
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(OFFSCREEN_Y)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(OFFSCREEN_Y);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 16,
          bounciness: 4,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: OFFSCREEN_Y, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, backdropOpacity, translateY]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (!mounted) {
      register(id, null);
      return;
    }
    register(
      id,
      <View style={{ flex: 1 }}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: backdropOpacity,
          }}
          className="bg-black/40"
        />
        <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
          <SheetBody onClose={onClose} title={title} headerAction={headerAction}>
            {children}
          </SheetBody>
        </Animated.View>
      </View>,
    );
  }, [mounted, title, headerAction, children, onClose, id, register, backdropOpacity, translateY]);

  useEffect(() => () => register(id, null), [id, register]);

  return null;
}
