import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Text, View, useColorScheme } from 'react-native';

export interface ErrorCardProps {
  message: string | null | undefined;
}

/**
 * A small, styled inline error card: tinted background, a danger-colored
 * accent bar, and an icon — replaces a plain line of red `<Text>` (which
 * reads as an unstyled framework default) everywhere a form/list surfaces
 * an error. Announces itself with a haptic tap + matching shake, the same
 * "shake" idiom `Fab` already uses for its press feedback.
 */
export function ErrorCard({ message }: ErrorCardProps) {
  const dark = useColorScheme() === 'dark';
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    opacity.setValue(0);
    translateY.setValue(-10);
    scale.setValue(0.95);
    shake.setValue(0);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 7 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 7 }),
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 45, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 45, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0.6, duration: 45, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -0.4, duration: 45, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: true }),
      ]),
    ]).start();
    // Re-trigger the entrance whenever the message text itself changes.
  }, [message, opacity, translateY, scale, shake]);

  if (!message) return null;

  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] });

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }, { scale }, { translateX: shakeX }] }}
      className="flex-row overflow-hidden rounded-ctl border border-danger/20 bg-danger-tint dark:border-danger-dark/20 dark:bg-danger-tint-dark"
    >
      <View className="w-1 bg-danger dark:bg-danger-dark" />
      <View className="flex-1 flex-row items-start gap-2.5 px-3.5 py-3">
        <Ionicons
          name="alert-circle"
          size={17}
          color={dark ? '#F16A6E' : '#E5484D'}
          style={{ marginTop: 1 }}
        />
        <Text className="flex-1 text-[13px] font-medium leading-[18px] text-danger dark:text-danger-dark">
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
