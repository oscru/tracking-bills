import type { CategorySpend } from '@repo/core/utils';
import { formatCurrency } from '@repo/core/utils';
import { useColorScheme } from 'nativewind';
import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
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
  /** Tapping a slice (one with a category) — usually opens that category. */
  onSlicePress?: (categoryId: string) => void;
}

const ENTRANCE = { duration: 750, easing: Easing.out(Easing.cubic) };
// How far the ring turns as it settles into place.
const ENTRANCE_TURN_DEG = -110;

// Ring thickness, as a share of the radius.
const RING = 0.34;
// Space between slices (px, along the ring) and their corner radius.
const GAP = 5;
const CORNER = 5;

const TAU = Math.PI * 2;
// Web: a hand cursor over tappable slices (`style` isn't in the svg
// elements' types, but react-native-svg passes it to the DOM node).
const HAND = { style: { cursor: 'pointer' } } as object;
const point = (c: number, r: number, a: number) =>
  `${(c + r * Math.sin(a)).toFixed(2)} ${(c - r * Math.cos(a)).toFixed(2)}`;

/**
 * Turns shares (summing to 1) into sweeps around the ring (summing to a full
 * turn) where none is below `min` radians: small ones are raised to it and
 * the rest shrink in proportion to how far above it they are.
 */
function fitSweeps(shares: number[], min: number): number[] {
  const n = shares.length;
  if (n <= 1) return shares.map((s) => s * TAU);
  // With many slices, the floor can't take more than ~60% of the ring.
  const floor = Math.min(min, (TAU * 0.6) / n);
  const raw = shares.map((s) => s * TAU);
  const deficit = raw.reduce((acc, r) => acc + Math.max(0, floor - r), 0);
  const surplus = raw.reduce((acc, r) => acc + Math.max(0, r - floor), 0);
  return raw.map((r) =>
    r <= floor ? floor : r - (surplus > 0 ? ((r - floor) / surplus) * deficit : 0),
  );
}

/**
 * One slice of the ring, drawn INSET by `CORNER` on every side; filled and
 * stroked `2 × CORNER` wide with round joins, it grows back to full size
 * with rounded corners. A slice too thin for its gap and corners collapses
 * to a radial line — a pill, once stroked.
 */
function slicePath(c: number, outer: number, inner: number, a0: number, a1: number) {
  const ro = outer - CORNER;
  const ri = inner + CORNER;
  const insetAt = (r: number) => (GAP / 2 + CORNER) / r;
  const mid = (a0 + a1) / 2;
  const span = (r: number) => {
    const inset = insetAt(r);
    return a1 - a0 > 2 * inset ? [a0 + inset, a1 - inset] : [mid, mid];
  };
  const [o0, o1] = span(ro);
  const [i0, i1] = span(ri);
  if (o0 === o1 && i0 === i1) return `M ${point(c, ri, mid)} L ${point(c, ro, mid)}`;
  const large = (a: number, b: number) => (b - a > Math.PI ? 1 : 0);
  return [
    `M ${point(c, ro, o0)}`,
    `A ${ro} ${ro} 0 ${large(o0, o1)} 1 ${point(c, ro, o1)}`,
    `L ${point(c, ri, i1)}`,
    `A ${ri} ${ri} 0 ${large(i0, i1)} 0 ${point(c, ri, i0)}`,
    'Z',
  ].join(' ');
}

/**
 * Donut of the month's spend, one slice per category in its own color —
 * rounded slices with air between them, each with a gradient (lighter
 * toward the center). Slices are tappable when `onSlicePress` is given. On
 * mount, and whenever the total changes (another month), the ring turns
 * and grows into place while the total fades in after it. Transform +
 * opacity only, so it runs on the UI thread.
 *
 * Drawn here with react-native-svg rather than a chart library: that one
 * couldn't round slices, and its fixed gradient ids clashed between two
 * charts on one web page.
 */
export function CategorySpendDonut({
  breakdown,
  total,
  currency,
  radius = 72,
  onSlicePress,
}: Props) {
  const { t } = useTranslation('common');
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  // The bigger desktop donut gets a bigger total to match.
  const large = radius >= 100;
  const xl = radius >= 140;
  const xxl = radius >= 200;
  // SVG ids are page-wide on web: one prefix per chart.
  const idPrefix = `donut${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const inner = radius * (1 - RING);
  const sum = breakdown.reduce((acc, c) => acc + c.total, 0);
  // Each slice's sweep, with a floor: a tiny category still gets room for
  // its rounded shape plus the gap on each side (taken from the bigger
  // slices) — drawn at its true size it collapsed to a pill wider than its
  // own slice and touched its neighbors. The list beside the chart keeps
  // the exact amounts; this only shapes the drawing.
  const sweeps = fitSweeps(
    breakdown.map((c) => (sum > 0 ? c.total / sum : 0)),
    (GAP + CORNER * 2 + 2) / (inner + CORNER),
  );
  // Where each slice starts: the running total of the ones before it.
  const starts = sweeps.reduce<number[]>((acc, sw, i) => [...acc, (acc[i] ?? 0) + sw], [0]);
  const slices = breakdown.map((c, i) => {
    const a0 = starts[i]!;
    const sweep = sweeps[i]!;
    return {
      key: c.categoryId ?? `none${i}`,
      categoryId: c.categoryId,
      // A single category is a whole ring: no gap to leave.
      path: breakdown.length === 1 ? null : slicePath(radius, radius, inner, a0, a0 + sweep),
      // Only when the floor couldn't be met (very many slices): a thinner
      // pill, so it still keeps clear of its neighbors.
      stroke: Math.min(CORNER * 2, Math.max(2, sweep * (inner + CORNER) - GAP)),
      color: mixColor(c.color, 'dark', dark ? 0.05 : 0.1),
      light: mixColor(c.color, 'light', dark ? 0.35 : 0.5),
    };
  });

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
        <Svg width={radius * 2} height={radius * 2}>
          <Defs>
            {slices.map((sl, i) => (
              <RadialGradient
                key={sl.key}
                id={`${idPrefix}g${i}`}
                cx={radius}
                cy={radius}
                r={radius}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset={inner / radius} stopColor={sl.light} />
                <Stop offset={1} stopColor={sl.color} />
              </RadialGradient>
            ))}
          </Defs>
          {slices.map((sl, i) => {
            const fill = `url(#${idPrefix}g${i})`;
            const onPress =
              onSlicePress && sl.categoryId ? () => onSlicePress(sl.categoryId!) : undefined;
            return sl.path == null ? (
              <Circle
                key={sl.key}
                cx={radius}
                cy={radius}
                r={(radius + inner) / 2}
                stroke={fill}
                strokeWidth={radius - inner}
                fill="none"
                onPress={onPress}
                {...(onPress ? HAND : null)}
              />
            ) : (
              <Path
                key={sl.key}
                d={sl.path}
                fill={fill}
                stroke={fill}
                strokeWidth={sl.stroke}
                strokeLinejoin="round"
                strokeLinecap="round"
                onPress={onPress}
                {...(onPress ? HAND : null)}
              />
            );
          })}
        </Svg>
      </Animated.View>
      {/* Outside the rotating ring, so the total never spins. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        className="items-center justify-center"
      >
        <Animated.View style={[{ alignItems: 'center' }, totalStyle]}>
          <Text
            className={`${xxl ? 'text-base' : xl ? 'text-sm' : large ? 'text-xs' : 'text-[11px]'} text-ink-2 dark:text-ink-2-dark`}
          >
            {t('total')}
          </Text>
          <Text
            className={`${xxl ? 'text-4xl' : xl ? 'text-3xl' : large ? 'text-xl' : 'text-base'} font-bold text-ink dark:text-ink-dark`}
          >
            {formatCurrency(total, currency)}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
