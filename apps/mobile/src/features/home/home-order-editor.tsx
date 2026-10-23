import { useUpdateProfile } from '@repo/core/hooks';
import type { Profile } from '@repo/core/types';
import { normalizeHomeLayout, type HomeLayoutItem } from '@repo/core/utils';
import { ICON_COLORS } from '@repo/ui';
import { GripVertical } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Switch, Text, View } from 'react-native';
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';

import { WIDGET_META } from './widget-catalog';

const ROW_HEIGHT = 72;
const ROW_GAP = 10;
const SLOT = ROW_HEIGHT + ROW_GAP;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * The app's Home customization (Opciones › Personalizar inicio): drag to
 * reorder the widgets, and switch each one on/off. Sizes are fixed in the
 * app — arranging and resizing them is the web dashboard's edit mode
 * (`useHomeEditor`). Saves `home_layout` (the order) and `home_hidden_items`
 * (shared with the web).
 */
export function HomeOrderEditor({ profile }: { profile: Profile }) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const updateProfile = useUpdateProfile();

  const [order, setOrder] = useState<HomeLayoutItem[]>(() =>
    normalizeHomeLayout(profile.home_layout),
  );
  const [hiddenSet, setHiddenSet] = useState<Set<HomeLayoutItem>>(
    () => new Set((profile.home_hidden_items ?? []) as HomeLayoutItem[]),
  );
  const [dragKey, setDragKey] = useState<HomeLayoutItem | null>(null);
  const [dragTop, setDragTop] = useState(0);

  // Gesture callbacks can fire well after the render that created them —
  // refs (kept current via effects, not written during render) are what let
  // them still see the latest order/hidden-set/drag-start instead of
  // whatever was true when the drag began.
  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);
  const hiddenRef = useRef(hiddenSet);
  useEffect(() => {
    hiddenRef.current = hiddenSet;
  }, [hiddenSet]);
  const dragStartTopRef = useRef(0);

  const persist = (nextOrder: HomeLayoutItem[], nextHidden: Set<HomeLayoutItem>) => {
    updateProfile.mutate({ home_layout: nextOrder, home_hidden_items: [...nextHidden] });
  };

  const toggleHidden = (key: HomeLayoutItem) => {
    const next = new Set(hiddenSet);
    const hiding = !next.has(key);
    if (hiding) next.add(key);
    else next.delete(key);
    setHiddenSet(next);

    // Switching a card off sends it to the bottom of the list — out of the
    // way, and out of the reorder drag's way — rather than leaving a gap
    // where it was. Turning it back on doesn't restore its old spot; the
    // user drags it back up if they want it somewhere specific.
    let nextOrder = order;
    if (hiding) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      nextOrder = [...order.filter((k) => k !== key), key];
      setOrder(nextOrder);
    }

    persist(nextOrder, next);
  };

  // Recreated every render (cheap — 5 short-lived closures) purely so each
  // row's `key` is captured correctly; the actual order/hidden-set reads
  // inside go through the refs above, not this closure's own `order`/
  // `hiddenSet`, since those can be stale by the time a callback fires (see
  // the comment on the refs). Uses `react-native-gesture-handler` (not the
  // core `PanResponder`) because the app root is wrapped in
  // `GestureHandlerRootView` — on native, that intercepts touch dispatch in
  // a way plain `PanResponder` children can't reliably receive.
  const makeGestureHandlers = (key: HomeLayoutItem) => ({
    onHandlerStateChange: (e: PanGestureHandlerStateChangeEvent) => {
      const { state, oldState } = e.nativeEvent;
      if (state === State.BEGAN) {
        const top = orderRef.current.indexOf(key) * SLOT;
        dragStartTopRef.current = top;
        setDragTop(top);
        setDragKey(key);
      } else if (oldState === State.ACTIVE) {
        setDragKey(null);
        persist(orderRef.current, hiddenRef.current);
      }
    },
    onGestureEvent: (e: PanGestureHandlerGestureEvent) => {
      const newTop = dragStartTopRef.current + e.nativeEvent.translationY;
      setDragTop(newTop);

      const list = orderRef.current;
      const currentIndex = list.indexOf(key);
      const targetIndex = clamp(Math.round(newTop / SLOT), 0, list.length - 1);
      if (targetIndex !== currentIndex) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const next = [...list];
        next.splice(currentIndex, 1);
        next.splice(targetIndex, 0, key);
        orderRef.current = next;
        setOrder(next);
      }
    },
  });

  return (
    <View style={{ height: order.length * SLOT - ROW_GAP }}>
      {order.map((key, index) => {
        const meta = WIDGET_META[key];
        const isHidden = hiddenSet.has(key);
        const isDragging = dragKey === key;
        const { onGestureEvent, onHandlerStateChange } = makeGestureHandlers(key);

        return (
          <View
            key={key}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: ROW_HEIGHT,
              top: isDragging ? dragTop : index * SLOT,
              zIndex: isDragging ? 10 : 1,
              elevation: isDragging ? 4 : 0,
              shadowColor: '#000',
              shadowOpacity: isDragging ? 0.15 : 0,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <View
              className="h-full flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-3 dark:border-line-dark dark:bg-surface-dark"
              style={isHidden ? { opacity: 0.5 } : undefined}
            >
              <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange}
                activeOffsetY={[-4, 4]}
              >
                <View hitSlop={10} className="-m-1.5 p-2.5">
                  <GripVertical size={20} color={dark ? ICON_COLORS.ink3Dark : ICON_COLORS.ink3} />
                </View>
              </PanGestureHandler>

              <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                <meta.icon size={16} color={ICON_COLORS.limeInk} />
              </View>

              <View className="flex-1">
                <Text
                  className="text-[15px] font-medium text-ink dark:text-ink-dark"
                  numberOfLines={1}
                >
                  {meta.label}
                </Text>
                <Text className="text-xs text-ink-2 dark:text-ink-2-dark" numberOfLines={1}>
                  {meta.description}
                </Text>
              </View>

              <Switch
                value={!isHidden}
                onValueChange={() => toggleHidden(key)}
                trackColor={{
                  false: dark ? ICON_COLORS.lineDark : '#E3E5E8',
                  true: ICON_COLORS.lime,
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={dark ? ICON_COLORS.lineDark : '#E3E5E8'}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
