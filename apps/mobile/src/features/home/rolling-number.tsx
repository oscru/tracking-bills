import { useEffect } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

// Each wheel is the digits 0–9 stacked three times; it always lands in the
// middle copy, so it can roll in either direction without running out.
const CYCLES = 3;
const STRIP = Array.from({ length: 10 * CYCLES }, (_, i) => String(i % 10));
const LANDING_CYCLE = 1;
const BASE_DURATION = 700;
const STAGGER_MS = 55;
// Settles with a slight overshoot, like a lock wheel clicking into place.
const SETTLE = Easing.out(Easing.back(0.9));

interface Props {
  /** The already-formatted value, e.g. "$48,250.00" — digits roll, the rest stays. */
  value: string;
  /** Font metrics both the wheels and the static characters use. `lineHeight` is required: it's the wheel's window. */
  textStyle: TextStyle & { lineHeight: number };
  /** Tailwind classes for color (and dark mode) on every character. */
  className?: string;
  /** Change it to replay the roll (e.g. on each screen focus). */
  trigger?: number;
}

/**
 * A number whose digits roll into place like the wheels of a combination
 * lock — each one a cylinder of 0–9 turning up or down by its own random
 * amount, left to right in a quick stagger. Separators ($ , .) stay put.
 * Each wheel is a strip of fixed-height digit cells translated on the UI
 * thread; tabular figures keep every column the same width.
 */
export function RollingNumber({ value, textStyle, className, trigger = 0 }: Props) {
  const style: TextStyle = {
    ...textStyle,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  };
  // Each digit's position among the digits only (separators don't count) —
  // the stagger order, left to right.
  const chars: { ch: string; order: number }[] = [];
  let digits = 0;
  for (const ch of value) {
    const isDigit = ch >= '0' && ch <= '9';
    chars.push({ ch, order: isDigit ? digits++ : -1 });
  }

  return (
    <View
      className="flex-row items-start"
      accessible
      accessibilityRole="text"
      accessibilityLabel={value}
    >
      {chars.map(({ ch, order }, i) => {
        if (order >= 0) {
          return (
            <DigitWheel
              key={i}
              digit={Number(ch)}
              order={order}
              trigger={trigger}
              style={style}
              className={className}
            />
          );
        }
        return (
          <Text
            key={i}
            style={[style, { height: textStyle.lineHeight }]}
            className={className}
            importantForAccessibility="no"
          >
            {ch}
          </Text>
        );
      })}
    </View>
  );
}

function DigitWheel({
  digit,
  order,
  trigger,
  style,
  className,
}: {
  digit: number;
  order: number;
  trigger: number;
  style: TextStyle & { lineHeight?: number };
  className?: string;
}) {
  const line = style.lineHeight ?? 0;
  const landing = LANDING_CYCLE * 10 + digit;
  const position = useSharedValue(landing);

  useEffect(() => {
    // A random direction and distance per wheel, so they don't all move as one.
    const distance = 4 + Math.floor(Math.random() * 6); // 4–9 steps
    const from = Math.random() < 0.5 ? landing - distance : landing + distance;
    position.set(from);
    position.set(
      withDelay(
        order * STAGGER_MS,
        withTiming(landing, { duration: BASE_DURATION + order * 25, easing: SETTLE }),
      ),
    );
  }, [trigger, landing, order, position]);

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -position.get() * line }],
  }));

  return (
    <View
      style={{ height: line, overflow: 'hidden' }}
      importantForAccessibility="no-hide-descendants"
    >
      {/* One fixed-height cell per digit, each laid out exactly like the
      static characters next to it. A single multi-line Text was cheaper, but
      Android's real line pitch didn't match \`lineHeight\` and the error
      added up down the strip — digits landed cut in half. */}
      <Animated.View style={stripStyle}>
        {STRIP.map((d, i) => (
          <Text key={i} style={[style, { height: line }]} className={className}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}
