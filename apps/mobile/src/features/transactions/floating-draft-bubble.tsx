import { useAccounts } from '@repo/core/hooks';
import { evalAmount, formatCurrency } from '@repo/core/utils';
import { GradientFill, ICON_COLORS, LIME_GLOW } from '@repo/ui';
import { useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  CircleArrowDown,
  CircleArrowUp,
  Receipt,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, PanResponder, Pressable, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { draftTransactionStore, useDraftTransaction } from './draft-transaction-store';
import { DiscardConfirmSheet } from './discard-confirm-sheet';

// Wide enough for the type icon next to the amount.
const WIDTH = 104;
const HEIGHT = 44;
const EDGE_MARGIN = 10;
const TAP_SLOP = 6;
const TAB_BAR_CLEARANCE = 96;
// The bubble wears the "action" treatment (lime gradient + glow, ink content):
// in ink it disappeared against the dark canvas, and tapping it is an action —
// it reopens the draft.
const BUBBLE_FG = ICON_COLORS.ink;
const PULSE_MS = 1800;

/**
 * A lime ring that keeps swelling out of the bubble and fading — a quiet
 * "you left something here". Reanimated, transform + opacity only.
 */
function PulseRing() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - t.value),
    transform: [{ scaleX: 1 + 0.25 * t.value }, { scaleY: 1 + 0.6 * t.value }],
  }));
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: HEIGHT / 2,
          borderWidth: 2,
          borderColor: ICON_COLORS.lime,
        },
        style,
      ]}
    />
  );
}

const TYPE_ICON: Record<string, LucideIcon> = {
  income: CircleArrowDown,
  expense: CircleArrowUp,
  transfer: ArrowLeftRight,
};

/**
 * Draggable "chat head" for a minimized new-transaction draft. Follows the
 * finger while dragging, springs to the nearest edge on release, and a
 * plain tap (no meaningful movement) reopens the form.
 */
export function FloatingDraftBubble() {
  const { t } = useTranslation('transactions');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { minimized, snapshot } = useDraftTransaction();
  const { data: accounts } = useAccounts();
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const { width, height } = Dimensions.get('window');
  const minY = insets.top + EDGE_MARGIN;
  const maxY = height - insets.bottom - HEIGHT - EDGE_MARGIN - TAB_BAR_CLEARANCE;
  const rightX = width - WIDTH - EDGE_MARGIN;

  // Both created once via lazy useState init (not useRef) — mutating a ref's
  // `.current` inside a PanResponder callback trips this project's "no ref
  // access during render" lint, since PanResponder.create's argument is
  // opaque to it. Animated.Value's own methods (setValue/spring) sidestep
  // that: they're plain method calls on a stable, once-created object.
  const [pos] = useState(() => new Animated.ValueXY({ x: rightX, y: height * 0.4 }));
  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        pos.setValue({ x: gesture.moveX - WIDTH / 2, y: gesture.moveY - HEIGHT / 2 });
      },
      onPanResponderRelease: (_, gesture) => {
        const moved = Math.abs(gesture.dx) > TAP_SLOP || Math.abs(gesture.dy) > TAP_SLOP;
        if (!moved) {
          router.push('/(app)/new-transaction');
          return;
        }
        const snapX = gesture.moveX < width / 2 ? EDGE_MARGIN : rightX;
        const snapY = Math.min(Math.max(gesture.moveY - HEIGHT / 2, minY), maxY);
        Animated.spring(pos, {
          toValue: { x: snapX, y: snapY },
          useNativeDriver: false,
          friction: 7,
          tension: 60,
        }).start();
      },
    }),
  );

  if (!minimized || !snapshot) return null;

  const currency =
    accounts?.find((a) => a.id === snapshot.accountId)?.currency ??
    accounts?.[0]?.currency ??
    'MXN';
  const amountValue = evalAmount(snapshot.amount);
  const amountLabel =
    amountValue != null && amountValue > 0 ? formatCurrency(amountValue, currency) : null;

  return (
    <Animated.View
      style={{ position: 'absolute', left: pos.x, top: pos.y, width: WIDTH, height: HEIGHT }}
    >
      <PulseRing />
      <View
        {...panResponder.panHandlers}
        style={[{ borderRadius: HEIGHT / 2, backgroundColor: ICON_COLORS.lime }, LIME_GLOW]}
        className="h-full w-full flex-row items-center justify-center gap-1.5 px-3"
      >
        <GradientFill radius={HEIGHT / 2} />
        {(() => {
          const TypeIcon = TYPE_ICON[snapshot.type] ?? Receipt;
          return <TypeIcon size={amountLabel ? 16 : 20} color={BUBBLE_FG} strokeWidth={2.4} />;
        })()}
        {amountLabel ? (
          <Text
            style={{ color: BUBBLE_FG, flexShrink: 1 }}
            className="text-[13px] font-extrabold"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {amountLabel}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={() => setConfirmDiscard(true)}
        hitSlop={10}
        accessibilityLabel={t('bubble.discard')}
        className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full border-2 border-canvas bg-danger dark:border-canvas-dark dark:bg-danger-dark"
      >
        <X size={13} color="#fff" />
      </Pressable>

      <DiscardConfirmSheet
        visible={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => {
          setConfirmDiscard(false);
          draftTransactionStore.clear();
        }}
      />
    </Animated.View>
  );
}
