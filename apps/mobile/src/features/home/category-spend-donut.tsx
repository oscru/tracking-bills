import type { CategorySpend } from '@repo/core/utils';
import { formatCurrency } from '@repo/core/utils';
import { ICON_COLORS } from '@repo/ui';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { mixColor } from '../design/color';

interface Props {
  breakdown: CategorySpend[];
  total: number;
  currency: string;
  radius?: number;
}

const ENTRANCE = { duration: 750, easing: Easing.out(Easing.cubic) };
// How far the ring turns as it settles into place.
const ENTRANCE_TURN_DEG = -110;

// The chart library's gradient runs from the pie's CENTER (lightest) to its
// outer edge (the slice color) — but a donut only shows the outer ~40% of
// that, so a mild center color barely registered. A near-white center and
// a slightly deepened edge keep a clearly visible light-to-rich sweep
// across the ring itself.
const GRADIENT_CENTER_LIGHTEN = 0.92;
const GRADIENT_EDGE_DARKEN = 0.12;

/**
 * Donut of the month's spend, one slice per category in its own color —
 * each with a radial gradient (lighter toward the center) and a thin gap
 * between slices. On mount, and whenever the total changes (another
 * month), the ring turns and grows into place while the total fades in
 * after it. Transform + opacity only, so it runs on the UI thread.
 */
export function CategorySpendDonut({ breakdown, total, currency, radius = 72 }: Props) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const surface = dark ? ICON_COLORS.surfaceDark : ICON_COLORS.surface;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, ENTRANCE);
  }, [total, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [0, 1], Extrapolation.CLAMP),
    transform: [
      { rotate: `${ENTRANCE_TURN_DEG * (1 - progress.value)}deg` },
      { scale: 0.72 + 0.28 * progress.value },
    ],
  }));
  // The total arrives once the ring has mostly settled.
  const totalStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.55, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: 6 * (1 - progress.value) }],
  }));

  return (
    <View style={{ width: radius * 2, height: radius * 2 }}>
      <Animated.View style={ringStyle}>
        <PieChart
          data={breakdown.map((c) => ({
            value: c.total,
            color: mixColor(c.color, 'dark', GRADIENT_EDGE_DARKEN),
            gradientCenterColor: mixColor(c.color, 'light', GRADIENT_CENTER_LIGHTEN),
          }))}
          donut
          showGradient
          radius={radius}
          innerRadius={radius * 0.62}
          innerCircleColor={surface}
          // Thin gaps between slices, in the card's own color.
          strokeWidth={breakdown.length > 1 ? 2 : 0}
          strokeColor={surface}
        />
      </Animated.View>
      {/* Outside the rotating ring, so the total never spins. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        className="items-center justify-center"
      >
        <Animated.View style={[{ alignItems: 'center' }, totalStyle]}>
          <Text className="text-[11px] text-ink-2 dark:text-ink-2-dark">Total</Text>
          <Text className="text-base font-bold text-ink dark:text-ink-dark">
            {formatCurrency(total, currency)}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
