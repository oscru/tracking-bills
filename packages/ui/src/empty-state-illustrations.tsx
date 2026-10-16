import { useEffect, useRef, type ComponentType, type Ref } from 'react';
import { Animated, Easing, Platform, useColorScheme } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { ICON_COLORS } from './icon-colors';

// Motion differs by platform — see `move`/`spin` below.
//
// Web: `Animated` also hands its components `collapsable={false}` (a native
// layout hint), which react-native-svg's web elements pass on to the DOM —
// another unknown-attribute warning. Dropped there before it gets that far.
function withoutCollapsable<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  if (Platform.OS !== 'web') return Component;
  function Svgish({
    collapsable: _collapsable,
    ref,
    ...rest
  }: P & { collapsable?: boolean; ref?: Ref<unknown> }) {
    return <Component {...(rest as P)} ref={ref} />;
  }
  return Svgish as ComponentType<P>;
}

const AnimatedG = Animated.createAnimatedComponent(withoutCollapsable(G));
const AnimatedPath = Animated.createAnimatedComponent(withoutCollapsable(Path));
const AnimatedCircle = Animated.createAnimatedComponent(withoutCollapsable(Circle));

const WEB = Platform.OS === 'web';
type Clock = Animated.Value;

/**
 * Animated props moving a group through `xs`/`ys` (in viewBox units) over
 * `inputRange` of the clock. Web: the SVG `transform` attribute, as an
 * interpolated string — react-native-svg's `translateX`/`translateY` props
 * reach the DOM there as unknown attributes (a warning, and no movement).
 * Native: those numeric props — `Animated` hands values straight to the
 * native view, and a transform STRING crashes it ("String cannot be cast").
 */
function move(clock: Clock, inputRange: number[], xs: number[], ys: number[]) {
  if (WEB) {
    return {
      transform: clock.interpolate({
        inputRange,
        outputRange: xs.map((x, i) => `translate(${x} ${ys[i]})`),
      }),
    };
  }
  return {
    translateX: clock.interpolate({ inputRange, outputRange: xs }),
    translateY: clock.interpolate({ inputRange, outputRange: ys }),
  };
}

/** Like `move`, rotating by `degs` around (`ox`, `oy`). */
function spin(clock: Clock, inputRange: number[], degs: number[], ox: number, oy: number) {
  if (WEB) {
    return {
      transform: clock.interpolate({
        inputRange,
        outputRange: degs.map((d) => `rotate(${d} ${ox} ${oy})`),
      }),
    };
  }
  return { origin: `${ox},${oy}`, rotation: clock.interpolate({ inputRange, outputRange: degs }) };
}

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
  const sparkleRotation = spin(clock, [0, 0.5, 1], [-10, 10, -10], 100, 19);
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={52} fill={badge} />
      <Rect x={28} y={28} width={56} height={56} rx={18} transform="rotate(45 56 56)" fill={ink} />
      <Circle cx={56} cy={34} r={6} fill={canvas} />
      <Circle cx={56} cy={34} r={3} fill={lime} />
      <AnimatedG {...sparkleRotation} opacity={sparkleOpacity}>
        <Path d="M100 14 V24 M95 19 H105" stroke={lime} strokeWidth={2.5} strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
}

export function AccountsEmptyIllustration({ size = 112 }: EmptyIllustrationProps) {
  const { badge, ink, canvas, lime } = useIllustrationColors();
  const clock = useLoopClock(1800);
  // Float: gently bobs up and settles back down.
  const bob = move(clock, [0, 0.5, 1], [0, 0, 0], [0, -5, 0]);
  const opacity = clock.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.65, 1, 0.65] });
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={52} fill={badge} />
      <Rect x={18} y={38} width={84} height={56} rx={16} fill={ink} />
      <Rect x={30} y={54} width={22} height={16} rx={4} fill={lime} />
      <Line x1={18} y1={60} x2={102} y2={60} stroke={canvas} strokeWidth={3} />
      <AnimatedG {...bob} opacity={opacity}>
        <Path d="M100 16 V26 M95 21 H105" stroke={lime} strokeWidth={2.5} strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
}

export function BudgetsEmptyIllustration({ size = 112 }: EmptyIllustrationProps) {
  const { badge, ink, canvas, lime } = useIllustrationColors();
  const clock = useLoopClock(1400);
  // Rising bubble: drifts up while fading in and back out, then resets.
  const rise = move(clock, [0, 1], [0, 0], [0, -14]);
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
      <AnimatedG {...rise} opacity={opacity}>
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
  const orbit = move(clock, [0, 0.25, 0.5, 0.75, 1], [0, 3, 0, -3, 0], [-3, 0, 3, 0, -3]);
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={52} fill={badge} />
      <Rect x={22} y={22} width={34} height={34} rx={12} fill={ink} />
      <Rect x={64} y={22} width={34} height={34} rx={12} fill={ink} opacity={0.55} />
      <Rect x={22} y={64} width={34} height={34} rx={12} fill={ink} opacity={0.3} />
      <Rect x={64} y={64} width={34} height={34} rx={12} fill={lime} />
      <AnimatedG {...orbit}>
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
  // The ping grows ×1.5 — by its radius on web, where a `scale` prop isn't
  // an SVG attribute; by `scale` natively, where the radius isn't animatable.
  const pingGrow = WEB
    ? { r: clock.interpolate({ inputRange: [0, 0.6, 1], outputRange: [7, 10.5, 7] }) }
    : {
        r: 7,
        origin: '94,78',
        scale: clock.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1.5, 1] }),
      };
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
      <AnimatedCircle cx={94} cy={78} {...pingGrow} fill={lime} opacity={pingOpacity} />
      <Path d="M22 20 V30 M17 25 H27" stroke={lime} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function NotificationsEmptyIllustration({ size = 112 }: EmptyIllustrationProps) {
  const { badge, ink, canvas, lime } = useIllustrationColors();
  const clock = useLoopClock(2600);
  // Ring: a short, damped swing about the hanging point at the start of each
  // cycle, then the bell rests for the remainder — a "ding", not a constant
  // wobble. The clapper lags behind, swinging the other way.
  const bellRotation = spin(
    clock,
    [0, 0.06, 0.14, 0.22, 0.3, 0.38, 1],
    [0, 14, -11, 7, -3, 0, 0],
    60,
    26,
  );
  const clapperX = move(
    clock,
    [0, 0.08, 0.16, 0.24, 0.32, 0.4, 1],
    [0, -4, 4, -2.5, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  );
  // The sparkle flashes while the bell is ringing, then dims.
  const sparkleOpacity = clock.interpolate({
    inputRange: [0, 0.1, 0.4, 1],
    outputRange: [0.3, 1, 0.3, 0.3],
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={52} fill={badge} />
      <AnimatedG {...bellRotation}>
        <AnimatedG {...clapperX}>
          <Circle cx={60} cy={86} r={7} fill={lime} />
        </AnimatedG>
        <Circle cx={60} cy={25} r={5} fill={ink} />
        <Path
          d="M60 28 C46 28 39 39 39 52 L39 68 L32 79 Q31 82 34 82 L86 82 Q89 82 88 79 L81 68 L81 52 C81 39 74 28 60 28 Z"
          fill={ink}
        />
        <Line x1={37} y1={71} x2={83} y2={71} stroke={canvas} strokeWidth={3} />
      </AnimatedG>
      <AnimatedG opacity={sparkleOpacity}>
        <Path d="M96 20 V30 M91 25 H101" stroke={lime} strokeWidth={2.5} strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
}

export function PeersEmptyIllustration({ size = 112 }: EmptyIllustrationProps) {
  const { badge, ink, canvas, lime } = useIllustrationColors();
  const clock = useLoopClock(2800);
  // A transfer: the coin arcs from one person to the other and back.
  const coin = move(clock, [0, 0.4, 0.5, 0.9, 1], [0, 32, 32, 0, 0], [0, 0, 0, 0, 0]);
  const lift = move(
    clock,
    [0, 0.2, 0.4, 0.5, 0.7, 0.9, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [0, -9, 0, 0, -9, 0, 0],
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={52} fill={badge} />
      <Circle cx={40} cy={56} r={11} fill={ink} />
      <Path d="M22 92 Q22 72 40 72 Q58 72 58 92 Z" fill={ink} />
      <Circle cx={80} cy={56} r={11} fill={ink} opacity={0.55} />
      <Path d="M62 92 Q62 72 80 72 Q98 72 98 92 Z" fill={ink} opacity={0.55} />
      <AnimatedG {...coin}>
        <AnimatedG {...lift}>
          <Circle cx={44} cy={32} r={8} fill={lime} />
          <Line
            x1={44}
            y1={28}
            x2={44}
            y2={36}
            stroke={canvas}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </AnimatedG>
      </AnimatedG>
    </Svg>
  );
}
