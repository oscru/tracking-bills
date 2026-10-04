import { useEffect, useRef } from 'react';
import { Animated, Easing, useColorScheme } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { ICON_COLORS } from './icon-colors';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface EmptyIllustrationProps {
  /** Width/height in px — the illustration is always drawn square. */
  size?: number;
}

/** Shared "filled shape on a lime-tint badge" palette for the empty-state
 * illustrations (ink body, lime accent, canvas-colored cutout lines) — no
 * faces, no secondary hue, light/dark via useColorScheme. */
function useIllustrationColors() {
  const dark = useColorScheme() === 'dark';
  return {
    badge: dark ? ICON_COLORS.limeTintDark : ICON_COLORS.limeTint,
    ink: dark ? ICON_COLORS.inkDark : ICON_COLORS.ink,
    canvas: dark ? ICON_COLORS.canvasDark : ICON_COLORS.canvas,
    lime: ICON_COLORS.lime,
    limeInk: dark ? ICON_COLORS.limeInkDark : ICON_COLORS.limeInk,
  };
}

/** A continuously looping 0→1 linear clock to interpolate a particle's
 * motion from (twinkle, bob, drift, ping…) — each illustration picks its
 * own `inputRange`/`outputRange` shape on top of the same clock, which is
 * what gives every module its own distinct movement. One timer per mounted
 * illustration; stops on unmount. */
function useLoopClock(durationMs: number) {
  const clock = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    clock.setValue(0);
    const loop = Animated.loop(
      Animated.timing(clock, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [clock, durationMs]);
  return clock;
}

export function TagsEmptyIllustration({ size = 112 }: EmptyIllustrationProps) {
  const { badge, ink, canvas, lime } = useIllustrationColors();
  const clock = useLoopClock(1600);
  // Twinkle: a quick flash near the start of each cycle, plus a small wiggle.
  const sparkleOpacity = clock.interpolate({
    inputRange: [0, 0.12, 0.3, 1],
    outputRange: [0.3, 1, 0.3, 0.3],
  });
  const sparkleRotation = clock.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-10, 10, -10],
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={52} fill={badge} />
      <Rect x={28} y={28} width={56} height={56} rx={18} transform="rotate(45 56 56)" fill={ink} />
      <Circle cx={56} cy={34} r={6} fill={canvas} />
      <Circle cx={56} cy={34} r={3} fill={lime} />
      <AnimatedG origin="100,19" rotation={sparkleRotation} opacity={sparkleOpacity}>
        <Path d="M100 14 V24 M95 19 H105" stroke={lime} strokeWidth={2.5} strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
}

export function AccountsEmptyIllustration({ size = 112 }: EmptyIllustrationProps) {
  const { badge, ink, canvas, lime } = useIllustrationColors();
  const clock = useLoopClock(1800);
  // Float: gently bobs up and settles back down.
  const translateY = clock.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -5, 0] });
  const opacity = clock.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.65, 1, 0.65] });
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={52} fill={badge} />
      <Rect x={18} y={38} width={84} height={56} rx={16} fill={ink} />
      <Rect x={30} y={54} width={22} height={16} rx={4} fill={lime} />
      <Line x1={18} y1={60} x2={102} y2={60} stroke={canvas} strokeWidth={3} />
      <AnimatedG translateY={translateY} opacity={opacity}>
        <Path d="M100 16 V26 M95 21 H105" stroke={lime} strokeWidth={2.5} strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
}

export function BudgetsEmptyIllustration({ size = 112 }: EmptyIllustrationProps) {
  const { badge, ink, canvas, lime } = useIllustrationColors();
  const clock = useLoopClock(1400);
  // Rising bubble: drifts up while fading in and back out, then resets.
  const translateY = clock.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const opacity = clock.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={52} fill={badge} />
      <Rect x={18} y={34} width={84} height={60} rx={14} fill={ink} />
      <Path
        d="M20 36 L60 68 L100 36"
        fill="none"
        stroke={canvas}
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Rect x={34} y={78} width={52} height={8} rx={4} fill={lime} />
      <AnimatedG translateY={translateY} opacity={opacity}>
        <Path d="M14 84 V94 M9 89 H19" stroke={lime} strokeWidth={2.5} strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
}

export function GoalsEmptyIllustration({ size = 112 }: EmptyIllustrationProps) {
  const { badge, ink, lime, limeInk } = useIllustrationColors();
  const clock = useLoopClock(1200);
  // Two stars blinking out of phase with each other.
  const star1Opacity = clock.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.3, 1, 0.3, 1],
  });
  const star2Opacity = clock.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0.3, 1, 0.3, 1, 0.3],
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={52} fill={badge} />
      <G transform="rotate(-12 60 58)">
        <Path d="M60 20 C74 32 78 52 72 74 L48 74 C42 52 46 32 60 20 Z" fill={ink} />
        <Circle cx={60} cy={48} r={9} fill={lime} />
        <Path d="M48 68 L34 84 L48 80 Z" fill={limeInk} />
        <Path d="M72 68 L86 84 L72 80 Z" fill={limeInk} />
        <Path d="M52 78 L50 96 L60 86 L70 96 L68 78 Z" fill={lime} />
      </G>
      <AnimatedPath
        d="M18 22 V32 M13 27 H23"
        stroke={lime}
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={star1Opacity}
      />
      <AnimatedPath
        d="M98 42 V50 M94 46 H102"
        stroke={lime}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={star2Opacity}
      />
    </Svg>
  );
}

export function CategoriesEmptyIllustration({ size = 112 }: EmptyIllustrationProps) {
  const { badge, ink, lime } = useIllustrationColors();
  const clock = useLoopClock(2400);
  // Orbit: drifts around its resting point in a small diamond loop.
  const translateX = clock.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 3, 0, -3, 0],
  });
  const translateY = clock.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [-3, 0, 3, 0, -3],
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={52} fill={badge} />
      <Rect x={22} y={22} width={34} height={34} rx={12} fill={ink} />
      <Rect x={64} y={22} width={34} height={34} rx={12} fill={ink} opacity={0.55} />
      <Rect x={22} y={64} width={34} height={34} rx={12} fill={ink} opacity={0.3} />
      <Rect x={64} y={64} width={34} height={34} rx={12} fill={lime} />
      <AnimatedG translateX={translateX} translateY={translateY}>
        <Path d="M12 14 V22 M8 18 H16" stroke={lime} strokeWidth={2} strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
}

export function TransactionsEmptyIllustration({ size = 112 }: EmptyIllustrationProps) {
  const { badge, ink, canvas, lime } = useIllustrationColors();
  const clock = useLoopClock(1500);
  // Flowing trail (dash pattern "2 6" — length 8, so a full -8 shift loops
  // seamlessly) plus a pinging dot at the plane's nose.
  const dashOffset = clock.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const pingScale = clock.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1.5, 1] });
  const pingOpacity = clock.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.35, 1] });
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={52} fill={badge} />
      <AnimatedPath
        d="M16 50 Q6 54 4 62"
        fill="none"
        stroke={ink}
        strokeWidth={2}
        strokeDasharray="2 6"
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        opacity={0.35}
      />
      <G transform="rotate(-18 60 55)">
        <Path d="M20 60 L96 36 L58 54 L48 84 L40 62 Z" fill={ink} />
        <Path d="M58 54 L96 36 L48 84" fill="none" stroke={canvas} strokeWidth={2} />
        <Path d="M58 54 L40 62" fill="none" stroke={canvas} strokeWidth={2} />
      </G>
      <AnimatedCircle
        cx={94}
        cy={78}
        r={7}
        fill={lime}
        origin="94,78"
        scale={pingScale}
        opacity={pingOpacity}
      />
      <Path d="M22 20 V30 M17 25 H27" stroke={lime} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}
