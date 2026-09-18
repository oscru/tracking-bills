import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  Text,
  type GestureResponderEvent,
  type PressableProps,
} from 'react-native';

export interface FabProps extends Omit<PressableProps, 'children' | 'style'> {
  /** Single glyph or short label; defaults to a plus sign. */
  glyph?: string;
  accessibilityLabel: string;
}

/**
 * Floating action button, pinned bottom-right by the caller's container.
 * Ink circle + lime glyph in light; lime circle + ink glyph in dark. Glows
 * with a lime shadow and gives a quick press bounce + shake + haptic tap.
 */
export function Fab({ glyph = '+', accessibilityLabel, onPress, ...props }: FabProps) {
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
        <Text className="text-3xl font-semibold leading-none text-lime dark:text-ink">
          {glyph}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
