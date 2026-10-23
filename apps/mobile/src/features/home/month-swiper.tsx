import { ICON_COLORS } from '@repo/ui';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// How far the label travels when it leaves/enters, and when a drag counts.
const TRAVEL = 90;
const COMMIT_DISTANCE = 48;
const COMMIT_VELOCITY = 650;
// Dragging toward a month that can't be shown (the future) only moves this
// fraction of the finger — a rubber band, then it springs back.
const RESISTANCE = 0.25;
const OUT = { duration: 140, easing: Easing.in(Easing.quad) };
const IN = { duration: 240, easing: Easing.out(Easing.cubic) };
const SETTLE = { damping: 18, stiffness: 240 };

interface Props {
  yearLabel: string;
  monthLabel: string;
  /** The selected month is the current one — can't go forward from it. */
  isCurrentMonth: boolean;
  /** Changes whenever the month does (e.g. `YYYY-MM`) — drives the slide-in. */
  monthKey: string;
  onShift: (delta: 1 | -1) => void;
  onOpenPicker: () => void;
}

/**
 * Home's month selector: tap the arrows, tap the name for the month grid,
 * or swipe the row sideways — the label follows the finger, slides out the
 * way it was pushed, and the new month slides in from the other side. Swipe
 * left = next month, right = previous. Runs on the UI thread (Reanimated +
 * Gesture Handler); only the month change itself goes back to JS.
 *
 * Shared values use `.get()`/`.set()` (Reanimated's React-Compiler-friendly
 * accessors) rather than `.value`, which the hooks lint reads as mutating a
 * ref and would make the compiler skip this component.
 */
export function MonthSwiper({
  yearLabel,
  monthLabel,
  isCurrentMonth,
  monthKey,
  onShift,
  onOpenPicker,
}: Props) {
  const { t } = useTranslation();
  const tx = useSharedValue(0);
  const canGoNext = useSharedValue(!isCurrentMonth);
  useEffect(() => {
    canGoNext.set(!isCurrentMonth);
  }, [isCurrentMonth, canGoNext]);

  const shift = useCallback(
    (delta: 1 | -1) => {
      if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
      onShift(delta);
    },
    [onShift],
  );

  // Slide the new month in from the side it's coming from — later months
  // from the right, earlier from the left (also after picking from the grid).
  const previousKey = useRef(monthKey);
  useEffect(() => {
    const previous = previousKey.current;
    previousKey.current = monthKey;
    if (previous === monthKey) return;
    // `YYYY-MM` keys compare correctly as strings.
    const dir = monthKey > previous ? 1 : -1;
    tx.set(dir * TRAVEL);
    tx.set(withTiming(0, IN));
  }, [monthKey, tx]);

  /** Arrow taps: the same out-then-in motion as a swipe. */
  const go = (delta: 1 | -1) => {
    if (delta === 1 && isCurrentMonth) return;
    tx.set(
      withTiming(-delta * TRAVEL, OUT, (finished) => {
        if (finished) scheduleOnRN(shift, delta);
      }),
    );
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          const towardFuture = e.translationX < 0;
          tx.set(towardFuture && !canGoNext.get() ? e.translationX * RESISTANCE : e.translationX);
        })
        .onEnd((e) => {
          const next =
            (e.translationX <= -COMMIT_DISTANCE || e.velocityX <= -COMMIT_VELOCITY) &&
            canGoNext.get();
          const prev = e.translationX >= COMMIT_DISTANCE || e.velocityX >= COMMIT_VELOCITY;
          if (next || prev) {
            const delta: 1 | -1 = next ? 1 : -1;
            tx.set(
              withTiming(-delta * TRAVEL, OUT, (finished) => {
                if (finished) scheduleOnRN(shift, delta);
              }),
            );
          } else {
            tx.set(withSpring(0, SETTLE));
          }
        }),
    [tx, canGoNext, shift],
  );

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(tx.get()), [0, TRAVEL], [1, 0.15], Extrapolation.CLAMP),
    transform: [{ translateX: tx.get() }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View className="flex-row items-center justify-center gap-4">
        <Pressable onPress={() => go(-1)} hitSlop={10} accessibilityLabel={t('previousMonth')}>
          <ChevronLeft size={22} color={ICON_COLORS.ink3} />
        </Pressable>
        <View className="min-w-[110px] items-center overflow-hidden">
          <Animated.View style={labelStyle}>
            <Pressable
              onPress={onOpenPicker}
              hitSlop={8}
              accessibilityLabel={t('changeMonth', { month: monthLabel, year: yearLabel })}
              className="items-center active:opacity-60"
            >
              <Text className="text-xs font-medium text-ink-3 dark:text-ink-3-dark">
                {yearLabel}
              </Text>
              <Text className="text-base font-bold capitalize text-ink dark:text-ink-dark">
                {monthLabel}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
        <Pressable
          onPress={() => go(1)}
          hitSlop={10}
          disabled={isCurrentMonth}
          accessibilityLabel={t('nextMonth')}
        >
          <ChevronRight size={22} color={isCurrentMonth ? '#D1D5DB' : ICON_COLORS.ink3} />
        </Pressable>
      </View>
    </GestureDetector>
  );
}
