import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  Text,
  useColorScheme,
  type GestureResponderEvent,
  type PressableProps,
} from 'react-native';

import { useFloatingTabBarInset } from './floating-tab-bar-inset';

export interface FabProps extends Omit<PressableProps, 'children' | 'style'> {
  /** Single glyph or short label; defaults to a plus sign. Ignored when `icon` is set. */
  glyph?: string;
  /** Lucide icon component to render instead of the text glyph (e.g. a pencil for an edit FAB). */
  icon?: LucideIcon;
  accessibilityLabel: string;
  /**
   * Pins the button absolute bottom-right, clearing any floating tab bar
   * (via `FloatingTabBarInsetContext`) so it never renders behind one —
   * the caller just drops `<Fab floating />` as a direct `Screen` child
   * instead of wrapping it in its own absolute positioning `View`.
   */
  floating?: boolean;
}

/**
 * Floating action button. With `floating`, pins itself bottom-right,
 * clearing a floating tab bar if present; otherwise positioned by the
 * caller's container. Ink circle + lime glyph in light; lime circle + ink
 * glyph in dark. Glows with a lime shadow and gives a quick press bounce +
 * shake + haptic tap.
 */
export function Fab({
  glyph = '+',
  icon: Icon,
  accessibilityLabel,
  floating = false,
  onPress,
  ...props
}: FabProps) {
  const dark = useColorScheme() === 'dark';
  const floatingTabBarInset = useFloatingTabBarInset();
  const scale = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 12,
    }).start();
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.6, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
    onPress?.(e);
  };

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={floating ? { position: 'absolute', right: 20, bottom: floatingTabBarInset + 24 } : undefined}
      {...props}
    >
      <Animated.View
        className="h-16 w-16 items-center justify-center rounded-full bg-ink dark:bg-lime"
        style={{
          transform: [{ scale }, { translateX }],
          shadowColor: '#B9F227',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.55,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        {Icon ? (
          <Icon size={26} color={dark ? '#1A1D21' : '#B9F227'} />
        ) : (
          <Text className="text-3xl font-semibold leading-none text-lime dark:text-ink">
            {glyph}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}
