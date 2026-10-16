import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardHeight } from './use-keyboard-height';
import { useIsDesktop } from './layout-mode';
import { useIsTopSheet, useSheetLevel, useSheetPortalRegister } from './sheet-portal';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Right-aligned header action (e.g. a "+ New" link). */
  headerAction?: ReactNode;
  children: ReactNode;
  /** Dismisses the keyboard the moment this sheet opens — a field left
   * focused behind it (e.g. tapping a date field right after typing a
   * description) otherwise keeps its keyboard up, which on a short screen
   * can squeeze the sheet down to barely anything visible. Default `true`;
   * set `false` for a sheet that deliberately `autoFocus`es a field of its
   * own on open (dismissing would just immediately close that). */
  dismissKeyboardOnOpen?: boolean;
}

const OFFSCREEN_Y = 600;
// Desktop: a centered dialog that fades in from slightly below.
const DIALOG_OFFSET_Y = 24;

function SheetBody({
  onClose,
  title,
  headerAction,
  children,
  desktop,
}: Omit<BottomSheetProps, 'visible'> & { desktop: boolean }) {
  const insets = useSafeAreaInsets();
  // Android only (0 on iOS) — see `useKeyboardHeight`'s doc comment for why
  // `KeyboardAvoidingView`'s own behaviors aren't used there.
  const keyboardHeight = useKeyboardHeight();

  // A sheet opened on top of another one is drawn raised above it (see
  // `useSheetLevel`): in dark mode a lighter surface with a hairline border —
  // the same color as the one behind made them blend into one.
  const level = useSheetLevel();

  // Web: Escape closes the sheet — only the top one when they're stacked.
  // (A click outside closes it through the backdrop `Pressable` below.)
  const isTop = useIsTopSheet();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || !isTop || typeof document === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Claimed: nothing else (the screen underneath) reacts to this Escape.
      e.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isTop]);

  const surface =
    level > 0
      ? 'bg-surface dark:border dark:border-white/10 dark:bg-[#22272D]'
      : 'bg-surface dark:bg-surface-dark';

  const sheet = desktop ? (
    // Desktop web: a centered dialog — same content, no grab handle.
    <View
      style={{ width: '100%', maxWidth: 520, paddingTop: 20, paddingBottom: 20 }}
      className={`max-h-[85%] rounded-[24px] shadow-2xl ${surface}`}
    >
      {(title || headerAction) && (
        <View className="flex-row items-center justify-between px-5 pb-2">
          <Text className="text-[17px] font-bold text-ink dark:text-ink-dark">{title}</Text>
          {headerAction}
        </View>
      )}
      {children}
    </View>
  ) : (
    <View
      style={{ paddingBottom: insets.bottom + 16 }}
      className={`max-h-[88%] rounded-t-[24px] ${surface}`}
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
  );

  return (
    <>
      <Pressable
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        onPress={onClose}
        accessibilityLabel="Cerrar"
      />
      {/* iOS: KeyboardAvoidingView's own "padding" behavior (reliable there).
          Android: manual paddingBottom from `useKeyboardHeight` — see the
          matching comment in `screen.tsx` for why. Pushing the bottom edge
          of this flex-end box up by the keyboard's height shifts the
          bottom-anchored sheet card up by the same amount. */}
      {desktop ? (
        <View
          pointerEvents="box-none"
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
        >
          {sheet}
        </View>
      ) : Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          behavior="padding"
          pointerEvents="box-none"
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          {sheet}
        </KeyboardAvoidingView>
      ) : (
        <View
          pointerEvents="box-none"
          style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: keyboardHeight }}
        >
          {sheet}
        </View>
      )}
    </>
  );
}

/** Dims what's behind the sheet — more over another sheet, so the one behind clearly recedes. */
function SheetBackdrop({ opacity }: { opacity: Animated.Value }) {
  const level = useSheetLevel();
  return (
    // A plain style color: NativeWind doesn't apply `className` to
    // `Animated.View`, so a `bg-black/40` class here never painted at all.
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity,
        backgroundColor: level > 0 ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.4)',
      }}
    />
  );
}

/**
 * Slides up from the bottom. Portals into `<SheetPortalHost>` (mounted at the
 * app root) instead of using RN's `Modal` — on Android, a `Modal` opens a
 * separate native window that can end up rendering behind the app's own tab
 * bar; portaling into the same view tree as the rest of the app avoids that.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  headerAction,
  children,
  dismissKeyboardOnOpen = true,
}: BottomSheetProps) {
  const id = useId();
  const register = useSheetPortalRegister();
  const desktop = useIsDesktop();
  const offscreen = desktop ? DIALOG_OFFSET_Y : OFFSCREEN_Y;
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(OFFSCREEN_Y)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (dismissKeyboardOnOpen) Keyboard.dismiss();
      setMounted(true);
      translateY.setValue(offscreen);
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
        Animated.timing(translateY, { toValue: offscreen, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, backdropOpacity, translateY, dismissKeyboardOnOpen, offscreen]);

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
        <SheetBackdrop opacity={backdropOpacity} />
        <Animated.View
          style={{
            flex: 1,
            transform: [{ translateY }],
            // The dialog fades in with the backdrop; the sheet just slides.
            opacity: desktop ? backdropOpacity : 1,
          }}
        >
          <SheetBody onClose={onClose} title={title} headerAction={headerAction} desktop={desktop}>
            {children}
          </SheetBody>
        </Animated.View>
      </View>,
    );
  }, [
    mounted,
    title,
    headerAction,
    children,
    onClose,
    id,
    register,
    backdropOpacity,
    translateY,
    desktop,
  ]);

  useEffect(() => () => register(id, null), [id, register]);

  return null;
}
