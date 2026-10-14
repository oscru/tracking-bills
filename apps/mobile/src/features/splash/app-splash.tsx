import { GradientFill, ICON_COLORS } from '@repo/ui';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

/** Placeholder mark until there's a real logo. */
const LOGO = '💸';
const APP_NAME = 'Finance Tracker';
// The splash shows at least this long, so a fast start still reads as a
// deliberate brand moment instead of a flash.
const MIN_VISIBLE_MS = 1200;
// …and at most this long: on a slow connection it steps aside and the app
// carries on loading normally, rather than holding the user here.
const MAX_VISIBLE_MS = 4000;
// Always ink — the same color as the native splash it takes over from, so
// the handoff between the two is invisible.
const BACKGROUND = ICON_COLORS.canvasDark;
const TILE = 96;

// Keep the native splash up until this screen has drawn its first frame.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Three lime dots blinking in turn — "loading", without a spinner. */
function LoadingDots() {
  return (
    <View className="flex-row gap-2">
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 160} />
      ))}
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(withTiming(1, { duration: 380 }), withTiming(0, { duration: 380 })),
          -1,
        ),
      ),
    );
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.75 * t.get(),
    transform: [{ scale: 0.8 + 0.25 * t.get() }],
  }));
  return (
    <Animated.View
      style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: ICON_COLORS.lime }, style]}
    />
  );
}

/**
 * The launch screen: just the logo tile on ink, a faint lime halo behind it
 * and three loading dots at the bottom. Takes over seamlessly from the
 * native splash (same ink background) and stays while the session — and,
 * when signed in, Inicio's first data — loads, so the app opens ready
 * instead of on a skeleton. At least `MIN_VISIBLE_MS`, at most
 * `MAX_VISIBLE_MS`; then it fades out as the logo lifts slightly, and
 * unmounts itself.
 */
export function AppSplash({ ready }: { ready: boolean }) {
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [done, setDone] = useState(false);

  const enter = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    enter.set(withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    const min = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    const max = setTimeout(() => setTimedOut(true), MAX_VISIBLE_MS);
    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, [enter]);

  const leaving = minElapsed && (ready || timedOut);
  useEffect(() => {
    if (!leaving) return;
    exit.set(
      withTiming(1, { duration: 360, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(setDone, true);
      }),
    );
  }, [leaving, exit]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.get() }));
  const tileStyle = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [{ scale: (0.88 + 0.12 * enter.get()) * (1 + 0.08 * exit.get()) }],
  }));
  const dotsStyle = useAnimatedStyle(() => ({ opacity: enter.get() }));

  if (done) return null;

  return (
    <Animated.View
      pointerEvents={leaving ? 'none' : 'auto'}
      onLayout={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: BACKGROUND, zIndex: 100000, elevation: 100000 },
        screenStyle,
      ]}
      accessibilityLabel={`${APP_NAME}, cargando`}
    >
      <View className="flex-1 items-center justify-center">
        {/* A faint, still halo — just enough to lift the tile off the ink. */}
        <View pointerEvents="none" style={{ position: 'absolute', width: 300, height: 300 }}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="splashHalo" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={ICON_COLORS.lime} stopOpacity={0.12} />
                <Stop offset="1" stopColor={ICON_COLORS.lime} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill="url(#splashHalo)" />
          </Svg>
        </View>

        <Animated.View
          style={[
            {
              width: TILE,
              height: TILE,
              borderRadius: 30,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: ICON_COLORS.lime,
            },
            tileStyle,
          ]}
        >
          <GradientFill radius={30} />
          <Text style={{ fontSize: 48 }}>{LOGO}</Text>
        </Animated.View>
      </View>

      <Animated.View style={[{ alignItems: 'center', paddingBottom: 72 }, dotsStyle]}>
        <LoadingDots />
      </Animated.View>
    </Animated.View>
  );
}
