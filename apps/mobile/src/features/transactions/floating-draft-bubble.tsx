import { Ionicons } from '@expo/vector-icons';
import { useAccounts } from '@repo/core/hooks';
import { evalAmount, formatCurrency } from '@repo/core/utils';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { draftTransactionStore, useDraftTransaction } from './draft-transaction-store';
import { DiscardConfirmSheet } from './discard-confirm-sheet';

const WIDTH = 72;
const HEIGHT = 42;
const EDGE_MARGIN = 10;
const TAP_SLOP = 6;
const TAB_BAR_CLEARANCE = 96;
const BUBBLE_BG = '#1A1D21';
const BUBBLE_FG = '#B9F227';

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  income: 'arrow-down-circle',
  expense: 'arrow-up-circle',
  transfer: 'swap-horizontal',
};

/**
 * Draggable "chat head" for a minimized new-transaction draft. Follows the
 * finger while dragging, springs to the nearest edge on release, and a
 * plain tap (no meaningful movement) reopens the form.
 */
export function FloatingDraftBubble() {
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
    accounts?.find((a) => a.id === snapshot.accountId)?.currency ?? accounts?.[0]?.currency ?? 'MXN';
  const amountValue = evalAmount(snapshot.amount);
  const amountLabel = amountValue != null && amountValue > 0 ? formatCurrency(amountValue, currency) : null;

  return (
    <Animated.View
      style={{ position: 'absolute', left: pos.x, top: pos.y, width: WIDTH, height: HEIGHT }}
    >
      <View
        {...panResponder.panHandlers}
        style={{ backgroundColor: BUBBLE_BG }}
        className="h-full w-full items-center justify-center rounded-full px-2 shadow-lg"
      >
        {amountLabel ? (
          <Text
            style={{ color: BUBBLE_FG }}
            className="text-[12px] font-bold"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {amountLabel}
          </Text>
        ) : (
          <Ionicons name={TYPE_ICON[snapshot.type] ?? 'receipt-outline'} size={20} color={BUBBLE_FG} />
        )}
      </View>

      <Pressable
        onPress={() => setConfirmDiscard(true)}
        hitSlop={10}
        accessibilityLabel="Descartar movimiento"
        className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full border-2 border-canvas bg-danger dark:border-canvas-dark dark:bg-danger-dark"
      >
        <Ionicons name="close" size={13} color="#fff" />
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
