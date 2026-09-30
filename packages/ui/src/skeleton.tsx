import { useColorScheme } from 'nativewind';
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  radius?: number;
}

/**
 * A pulsing placeholder block for loading states. The pulse is opacity-only
 * (native driver), so it never touches layout and can't fight with
 * scrolling or any other layout-affecting animation on the screen.
 *
 * Colors are set via inline `style`, not a NativeWind `className` — NativeWind
 * doesn't patch `Animated.View` (a component `Animated.createAnimatedComponent`
 * wraps at runtime, distinct from the plain `View` NativeWind's babel plugin
 * targets), so a `className` here would silently render with no background at all.
 */
export function Skeleton({ width = '100%', height = 16, radius = 8 }: SkeletonProps) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        opacity,
        backgroundColor: dark ? '#23272C' : '#E3E5E8',
      }}
    />
  );
}
