import { Ionicons } from '@expo/vector-icons';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionWithRefs } from '@repo/core/supabase';
import { formatCurrency, formatDate } from '@repo/core/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View, useColorScheme } from 'react-native';
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerEventPayload,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';

// The revealed action button's own width.
const ACTION_WIDTH = 96;
// Drag past this + release -> snap open, revealing the button (needs a follow-up tap).
const SOFT_THRESHOLD = ACTION_WIDTH / 2;
// Drag past this (while still dragging, no need to release) -> skip the reveal
// and jump straight to the destination.
const HARD_THRESHOLD = 190;
// How long the "paint the row" confirmation takes before actually navigating.
const FILL_DURATION = 300;

type OpenState = 'closed' | 'left' | 'right';

interface SwipeMeta {
  side: 'left' | 'right';
  tone: 'ink' | 'muted';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const EDIT_META: SwipeMeta = { side: 'left', tone: 'ink', icon: 'pencil', label: 'Editar' };
const VIEW_META: SwipeMeta = { side: 'right', tone: 'muted', icon: 'eye-outline', label: 'Ver' };

/** Tailwind bg + raw icon/text colors for one action's tone, light/dark aware. */
function swipeColors(tone: SwipeMeta['tone'], dark: boolean) {
  return {
    bg: tone === 'ink' ? 'bg-ink dark:bg-lime' : 'bg-[#F1F2F4] dark:bg-line-dark',
    icon: tone === 'ink' ? (dark ? '#1A1D21' : '#B9F227') : dark ? '#F2F3F5' : '#1A1D21',
    text: tone === 'ink' ? 'text-lime dark:text-ink' : 'text-ink dark:text-ink-dark',
  };
}

/** The colored action panel revealed behind the row — pinned to its edge, fixed width. */
function SwipeAction({
  translateX,
  meta,
  onPress,
}: {
  translateX: Animated.AnimatedAddition<number>;
  meta: SwipeMeta;
  onPress: () => void;
}) {
  const dark = useColorScheme() === 'dark';
  const { side, tone, icon, label } = meta;
  const opacity = translateX.interpolate({
    inputRange: side === 'left' ? [0, ACTION_WIDTH / 2] : [-ACTION_WIDTH / 2, 0],
    outputRange: side === 'left' ? [0, 1] : [1, 0],
    extrapolate: 'clamp',
  });
  const colors = swipeColors(tone, dark);

  return (
    <Animated.View
      style={[
        { position: 'absolute', top: 0, bottom: 0, width: ACTION_WIDTH, opacity },
        side === 'left' ? { left: 0 } : { right: 0 },
      ]}
    >
      <Pressable
        onPress={onPress}
        className={`flex-1 items-center justify-center gap-1 ${colors.bg}`}
      >
        <Ionicons name={icon} size={18} color={colors.icon} />
        <Text className={`text-xs font-semibold ${colors.text}`}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Plays once an action is confirmed (tap or hard swipe): the button's own
 * color sweeps out from its edge to cover the whole row, its icon staying
 * put at the edge — "the row gets painted by the button that won."
 */
function SwipeFill({
  meta,
  progress,
  rowWidth,
}: {
  meta: SwipeMeta;
  progress: Animated.Value;
  rowWidth: number;
}) {
  const dark = useColorScheme() === 'dark';
  const { side, tone, icon, label } = meta;
  const colors = swipeColors(tone, dark);
  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [ACTION_WIDTH, Math.max(rowWidth, ACTION_WIDTH)],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 0, bottom: 0, width },
        side === 'left' ? { left: 0 } : { right: 0 },
      ]}
      className={colors.bg}
    >
      <View
        style={[
          { position: 'absolute', top: 0, bottom: 0, width: ACTION_WIDTH },
          side === 'left' ? { left: 0 } : { right: 0 },
        ]}
        className="items-center justify-center gap-1"
      >
        <Ionicons name={icon} size={18} color={colors.icon} />
        <Text className={`text-xs font-semibold ${colors.text}`}>{label}</Text>
      </View>
    </Animated.View>
  );
}

export function TransactionListItem({
  transaction,
  onPress,
  onEdit,
  isOpen,
  onReveal,
}: {
  transaction: TransactionWithRefs;
  /** Row tap, and the "Ver" swipe action. Pass a stable (`useCallback`) function —
   * it feeds the gesture handling below, which rebuilds its native event
   * binding whenever this identity changes, causing real glitches if it's a
   * fresh arrow function every render (e.g. `onPress={() => go(item.id)}`). */
  onPress: (id: string) => void;
  /** The "Editar" swipe action. Same stability requirement as `onPress`. */
  onEdit: (id: string) => void;
  /** Whether the *list* considers this the currently-revealed row. When this
   * goes false while the row still thinks it's open (another row revealed,
   * the screen lost focus...), it snaps itself shut. */
  isOpen: boolean;
  /** Called with this row's id once it reveals a swipe action, so the list
   * can make it the (only) open one. Pass a stable function. */
  onReveal: (id: string) => void;
}) {
  const {
    type,
    amount,
    description,
    transaction_date,
    category,
    account,
    to_account,
    is_completed,
    tags,
  } = transaction;
  const currency = account?.currency ?? 'MXN';
  const value = formatCurrency(amount, currency);
  const primaryTag = tags?.[0] ?? null;
  const extraTags = tags && tags.length > 1 ? tags.length - 1 : 0;

  const [rowWidth, setRowWidth] = useState(0);
  const [fillMeta, setFillMeta] = useState<SwipeMeta | null>(null);

  // Re-derive stable (no-arg) handlers from the stable `onPress`/`onEdit`/
  // `onReveal` props + this row's own id — these are what the gesture logic
  // below uses.
  const handleView = useCallback(() => onPress(transaction.id), [onPress, transaction.id]);
  const handleEdit = useCallback(() => onEdit(transaction.id), [onEdit, transaction.id]);
  const reveal = useCallback(() => onReveal(transaction.id), [onReveal, transaction.id]);

  // `dragX` is the raw, per-gesture native translation (native-driven — smooth,
  // resets to 0 each gesture). `rowOffset` is the settled base position between
  // gestures (animated via JS on release). Their sum drives the row's transform.
  // `react-hooks/refs` flags these because `dragX`/`rowOffset` later flow into
  // `Animated.event`/`Animated.add` — the standard `useRef(new Animated.Value(0))`
  // imperative-handle pattern the RN Animated API is built around, not the
  // "reading a DOM ref during render" case this rule targets.
  // eslint-disable-next-line react-hooks/refs
  const dragX = useRef(new Animated.Value(0)).current;
  // eslint-disable-next-line react-hooks/refs
  const rowOffset = useRef(new Animated.Value(0)).current;
  const translateX = useMemo(() => Animated.add(rowOffset, dragX), [rowOffset, dragX]);
  // eslint-disable-next-line react-hooks/refs -- same false positive as `dragX` above
  const fillProgress = useRef(new Animated.Value(0)).current;

  const openState = useRef<OpenState>('closed');
  const gestureStartOffset = useRef(0);
  const triggered = useRef(false);

  const close = useCallback(() => {
    openState.current = 'closed';
    dragX.setValue(0);
    Animated.spring(rowOffset, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
  }, [dragX, rowOffset]);

  const snapTo = useCallback(
    (toValue: number, state: OpenState) => {
      openState.current = state;
      dragX.setValue(0);
      Animated.spring(rowOffset, {
        toValue,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }).start();
      // Tell the list "I'm open" so it can make me the only open row.
      if (state !== 'closed') reveal();
    },
    [dragX, rowOffset, reveal],
  );

  // The list is the single source of truth for "which row is open" — if it
  // ever says this one shouldn't be (another row revealed, the screen lost
  // focus and it reset everyone...) while we still think we are, snap shut.
  // This is what actually guarantees "back to the original state", instead
  // of relying on every possible path that opens/leaves a row to remember to
  // clean up after itself.
  useEffect(() => {
    if (!isOpen && openState.current !== 'closed') {
      close();
    }
  }, [isOpen, close]);

  const fire = useCallback(
    (action: () => void, meta: SwipeMeta) => {
      if (triggered.current) return;
      triggered.current = true;
      setFillMeta(meta);
      fillProgress.setValue(0);
      Animated.parallel([
        Animated.timing(fillProgress, {
          toValue: 1,
          duration: FILL_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.spring(rowOffset, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }),
      ]).start(() => {
        action();
        // The list screen stays mounted behind whatever we just navigated to
        // (expo-router keeps it in the stack), so this row's state persists —
        // reset it now, off-screen, so it's back to normal by the time we return.
        triggered.current = false;
        openState.current = 'closed';
        fillProgress.setValue(0);
        setFillMeta(null);
      });
    },
    [fillProgress, rowOffset],
  );

  const handleDragUpdate = useCallback(
    (e: { nativeEvent: PanGestureHandlerEventPayload }) => {
      if (triggered.current) return;
      const total = gestureStartOffset.current + e.nativeEvent.translationX;
      if (total > HARD_THRESHOLD) fire(handleEdit, EDIT_META);
      else if (total < -HARD_THRESHOLD) fire(handleView, VIEW_META);
    },
    [fire, handleEdit, handleView],
  );

  // The `listener` here runs on the JS thread on every native gesture update
  // (unlike `Animated.Value.addListener`, which is unreliable on a value this
  // composed — `Animated.add` of a native-driven value — under useNativeDriver).
  // That's what lets a "hard" swipe fire mid-drag instead of waiting for release.
  /* eslint-disable react-hooks/refs -- same false positive as `dragX` above */
  const onGestureEvent = useMemo(
    () =>
      Animated.event<PanGestureHandlerEventPayload>([{ nativeEvent: { translationX: dragX } }], {
        useNativeDriver: true,
        listener: handleDragUpdate,
      }),
    [dragX, handleDragUpdate],
  );
  /* eslint-enable react-hooks/refs */

  const onHandlerStateChange = useCallback(
    (e: PanGestureHandlerStateChangeEvent) => {
      const { state, oldState, translationX } = e.nativeEvent;
      if (state === State.BEGAN) {
        triggered.current = false;
        gestureStartOffset.current =
          openState.current === 'left' ? ACTION_WIDTH : openState.current === 'right' ? -ACTION_WIDTH : 0;
        return;
      }
      if (oldState === State.ACTIVE) {
        if (triggered.current) return;
        const total = gestureStartOffset.current + translationX;
        // A very fast swipe can cross HARD_THRESHOLD and have the finger lift
        // before the `Animated.event` listener (which syncs back from the
        // native driver, not perfectly real-time) catches up — fall back to
        // checking it here too, against the release event's own exact data.
        if (total > HARD_THRESHOLD) fire(handleEdit, EDIT_META);
        else if (total < -HARD_THRESHOLD) fire(handleView, VIEW_META);
        else if (total > SOFT_THRESHOLD) snapTo(ACTION_WIDTH, 'left');
        else if (total < -SOFT_THRESHOLD) snapTo(-ACTION_WIDTH, 'right');
        else snapTo(0, 'closed');
      }
    },
    [snapTo, fire, handleEdit, handleView],
  );

  let title: string;
  let subtitle: string;
  let sign: string;
  let amountClass: string;
  let color: string;

  if (type === 'transfer') {
    title = 'Transferencia';
    subtitle = `${account?.name ?? '—'} → ${to_account?.name ?? '—'}`;
    sign = '';
    amountClass = 'text-ink-2 dark:text-ink-2-dark';
    color = '#4D7C0F';
  } else {
    title = category ? resolveCategoryLabel(category) : 'Sin categoría';
    subtitle =
      [description?.trim(), account?.name].filter(Boolean).join(' · ') ||
      formatDate(transaction_date);
    sign = type === 'income' ? '+' : '−';
    amountClass = type === 'income' ? 'text-pos dark:text-pos-dark' : 'text-ink dark:text-ink-dark';
    color = category?.color ?? '#94A3B8';
  }

  return (
    <View
      className="overflow-hidden"
      onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
    >
      <SwipeAction translateX={translateX} meta={EDIT_META} onPress={() => fire(handleEdit, EDIT_META)} />
      <SwipeAction translateX={translateX} meta={VIEW_META} onPress={() => fire(handleView, VIEW_META)} />

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-8, 8]}
      >
        <Animated.View style={{ transform: [{ translateX }] }}>
          <Pressable
            onPress={handleView}
            className="flex-row items-center gap-3 bg-canvas px-3 py-3 active:opacity-60 dark:bg-canvas-dark"
          >
            <View
              className="h-[38px] w-[38px] items-center justify-center rounded-full"
              style={{ backgroundColor: type === 'transfer' ? '#F2FBDC' : color + '1F' }}
            >
              {type === 'transfer' ? (
                <Ionicons name="swap-horizontal" size={18} color={color} />
              ) : (
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              )}
            </View>

            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-ink dark:text-ink-dark">{title}</Text>
              <Text className="text-[13px] text-ink-2 dark:text-ink-2-dark" numberOfLines={1}>
                {subtitle}
              </Text>
              {primaryTag ? (
                <View className="mt-0.5 flex-row items-center gap-1">
                  <Ionicons name="pricetag-outline" size={10} color="#9CA3AF" />
                  <Text className="text-[11px] text-ink-3 dark:text-ink-3-dark" numberOfLines={1}>
                    {primaryTag.name}
                    {extraTags > 0 ? ` +${extraTags}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="items-end">
              <Text className={`text-[15px] font-bold ${amountClass}`}>
                {sign}
                {value}
              </Text>
              {is_completed === false ? (
                <Text className="text-[10px] font-semibold uppercase tracking-wide text-[#B45309]">
                  Pendiente
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      </PanGestureHandler>

      {fillMeta ? <SwipeFill meta={fillMeta} progress={fillProgress} rowWidth={rowWidth} /> : null}
    </View>
  );
}
