import {
  GRID_COLUMNS,
  collapseEmptyRows,
  gridRows,
  moveItem,
  resizeItem,
  type GridDevice,
  type GridItem,
  type HomeLayoutItem,
} from '@repo/core/utils';
import { ICON_COLORS } from '@repo/ui';
import { GripVertical, Minus, MoveDiagonal2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  ZoomIn,
  ZoomOut,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useWidgetMeta } from './widget-catalog';

/**
 * Home's widget matrix (see `home-grid.ts` in @repo/core for the rules).
 * Every widget is absolutely positioned from its cell — no flow layout — so
 * moving and resizing are just state changes, animated here.
 *
 * In edit mode: the empty cells are drawn as a dashed matrix, a widget can
 * be dragged anywhere (a dashed lime slot shows the cell it'll land on, and
 * whatever it would cover is pushed down live) and resized from its ◢
 * corner. Phones (and narrow web) start a drag with a long press so a plain
 * swipe still scrolls.
 */

/** Row height and gap between cells, in px. */
const ROW_H = 80;
const GAP: Record<GridDevice, number> = { desktop: 16, mobile: 12 };
const SETTLE = { duration: 200 };

type Rect = { left: number; top: number; width: number; height: number };
type Preview = { items: GridItem[]; activeId: HomeLayoutItem; mode: 'move' | 'resize' };

export function WidgetGrid({
  items,
  device,
  editing,
  longPress,
  renderWidget,
  onChange,
  onRemove,
  onDraggingChange,
}: {
  items: GridItem[];
  device: GridDevice;
  editing: boolean;
  /** Drag starts with a long press (touch) instead of right away (mouse). */
  longPress: boolean;
  /** The widget's content, or null when it has nothing to show right now. */
  renderWidget: (id: HomeLayoutItem) => ReactNode | null;
  onChange: (items: GridItem[]) => void;
  onRemove: (id: HomeLayoutItem) => void;
  /** So the screen can stop scrolling while a widget is being dragged. */
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const { t } = useTranslation('home');
  const cols = GRID_COLUMNS[device];
  const gap = GAP[device];
  const [width, setWidth] = useState(0);
  const cellW = width > 0 ? (width - gap * (cols - 1)) / cols : 0;
  const [preview, setPreview] = useState<Preview | null>(null);

  // What each widget renders, computed once per render.
  const contents = new Map<HomeLayoutItem, ReactNode | null>();
  for (const it of items) contents.set(it.id, renderWidget(it.id));

  // Showing (not editing): rows only an empty reminder occupied fold away.
  const layout = preview
    ? preview.items
    : editing
      ? items
      : collapseEmptyRows(items, (id) => contents.get(id) != null);

  const rectOf = (it: { x: number; y: number; w: number; h: number }): Rect => ({
    left: it.x * (cellW + gap),
    top: it.y * (ROW_H + gap),
    width: it.w * cellW + (it.w - 1) * gap,
    height: it.h * ROW_H + (it.h - 1) * gap,
  });

  const rows = gridRows(layout);
  const shownRows = editing ? Math.max(rows + 2, 4) : rows;
  const height = Math.max(0, shownRows * (ROW_H + gap) - gap);

  // Gesture callbacks are set up once per widget, not every render — they
  // reach the latest props and state through this ref.
  const latest = useRef({ items, cellW, gap, device, onChange, onDraggingChange });
  useEffect(() => {
    latest.current = { items, cellW, gap, device, onChange, onDraggingChange };
  });

  // The newest preview, set synchronously — the gesture can end before the
  // render that would put it in `latest`.
  const pending = useRef<GridItem[] | null>(null);

  // Stable (no deps) so each widget's gestures are built once.
  const onGestureStart = useCallback((id: HomeLayoutItem, mode: Preview['mode']) => {
    pending.current = latest.current.items;
    setPreview({ items: latest.current.items, activeId: id, mode });
    latest.current.onDraggingChange?.(true);
  }, []);
  const onGestureMove = useCallback((id: HomeLayoutItem, left: number, top: number) => {
    const l = latest.current;
    const x = Math.round(left / (l.cellW + l.gap));
    const y = Math.max(0, Math.round(top / (ROW_H + l.gap)));
    const next = moveItem(l.items, id, x, y, l.device);
    pending.current = next;
    setPreview((p) => (p ? { ...p, items: next } : p));
  }, []);
  const onGestureResize = useCallback((id: HomeLayoutItem, width: number, height: number) => {
    const l = latest.current;
    const w = Math.round((width + l.gap) / (l.cellW + l.gap));
    const h = Math.round((height + l.gap) / (ROW_H + l.gap));
    const next = resizeItem(l.items, id, w, h, l.device);
    pending.current = next;
    setPreview((p) => (p ? { ...p, items: next } : p));
  }, []);
  /** Commits the preview — also when the gesture is cancelled midway, so nothing is left half-moved. */
  const onGestureEnd = useCallback(() => {
    const l = latest.current;
    if (pending.current) l.onChange(pending.current);
    pending.current = null;
    setPreview(null);
    l.onDraggingChange?.(false);
  }, []);
  const handlers = useMemo(
    () => ({
      start: onGestureStart,
      move: onGestureMove,
      resize: onGestureResize,
      end: onGestureEnd,
    }),
    [onGestureStart, onGestureMove, onGestureResize, onGestureEnd],
  );

  const active = preview ? layout.find((it) => it.id === preview.activeId) : undefined;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height, position: 'relative' }}
    >
      {editing && cellW > 0 ? (
        <MatrixCells cols={cols} rows={shownRows} cellW={cellW} gap={gap} />
      ) : null}

      {active && cellW > 0 ? (
        <DropSlot
          rect={rectOf(active)}
          label={preview?.mode === 'resize' ? `${active.w} × ${active.h}` : t('editor.dropHere')}
        />
      ) : null}

      {cellW > 0
        ? layout.map((it, i) => (
            <GridCell
              key={it.id}
              item={it}
              index={i}
              rect={rectOf(it)}
              editing={editing}
              active={preview?.activeId === it.id}
              longPress={longPress}
              handlers={handlers}
              onRemove={() => onRemove(it.id)}
            >
              {contents.get(it.id) ?? (editing ? <DormantWidget itemKey={it.id} /> : null)}
            </GridCell>
          ))
        : null}
    </View>
  );
}

/* ---------------------------------------------------------------------------
 * One widget
 * ------------------------------------------------------------------------- */

type Handlers = {
  start: (id: HomeLayoutItem, mode: Preview['mode']) => void;
  move: (id: HomeLayoutItem, left: number, top: number) => void;
  resize: (id: HomeLayoutItem, w: number, h: number) => void;
  end: () => void;
};

function GridCell({
  item,
  index,
  rect,
  editing,
  active,
  longPress,
  handlers,
  onRemove,
  children,
}: {
  item: GridItem;
  index: number;
  rect: Rect;
  editing: boolean;
  /** Being dragged or resized right now: follows the pointer instead of its cell. */
  active: boolean;
  longPress: boolean;
  handlers: Handlers;
  onRemove: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation(['common', 'home']);
  const meta = useWidgetMeta()(item.id);
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';

  const left = useSharedValue(rect.left);
  const top = useSharedValue(rect.top);
  const w = useSharedValue(rect.width);
  const h = useSharedValue(rect.height);
  const lifted = useSharedValue(0);
  // Where the widget was when the gesture began, and whether one is running.
  const origin = useSharedValue({ left: 0, top: 0, width: 0, height: 0 });
  const started = useSharedValue(false);
  const placed = useSharedValue(false);

  // Glide to the cell whenever it changes — except mid-gesture, where the
  // gesture drives the position. The first placement is instant.
  useEffect(() => {
    if (active) return;
    if (!placed.get()) {
      placed.set(true);
      left.set(rect.left);
      top.set(rect.top);
      w.set(rect.width);
      h.set(rect.height);
      return;
    }
    left.set(withTiming(rect.left, SETTLE));
    top.set(withTiming(rect.top, SETTLE));
    w.set(withTiming(rect.width, SETTLE));
    h.set(withTiming(rect.height, SETTLE));
  }, [active, rect.left, rect.top, rect.width, rect.height, left, top, w, h, placed]);

  useEffect(() => {
    lifted.set(withTiming(active ? 1 : 0, { duration: 150 }));
  }, [active, lifted]);

  // Position/size and the "lifted" tilt live on separate views: the outer
  // one also runs the enter/exit animations, which drive `transform`
  // themselves and would fight a `transform` set here.
  const frameStyle = useAnimatedStyle(() => ({
    left: left.get(),
    top: top.get(),
    width: w.get(),
    height: h.get(),
    zIndex: lifted.get() > 0 ? 50 : 1,
  }));
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + lifted.get() * 0.02 }, { rotate: `${lifted.get() * 0.8}deg` }],
    shadowOpacity: lifted.get() * 0.28,
  }));

  const { start, move, resize, end } = handlers;
  const id = item.id;
  const moveGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .onStart(() => {
        started.set(true);
        origin.set({ left: left.get(), top: top.get(), width: w.get(), height: h.get() });
        start(id, 'move');
      })
      .onUpdate((e) => {
        left.set(origin.get().left + e.translationX);
        top.set(origin.get().top + e.translationY);
        move(id, left.get(), top.get());
      })
      .onFinalize(() => {
        // Only for a drag that actually started (not a tap or a cancelled long press).
        if (started.get()) end();
        started.set(false);
      });
    return longPress ? pan.activateAfterLongPress(220) : pan.minDistance(4);
  }, [longPress, id, start, move, end, left, top, w, h, origin, started]);

  const resizeGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(1)
        .onStart(() => {
          started.set(true);
          origin.set({ left: left.get(), top: top.get(), width: w.get(), height: h.get() });
          start(id, 'resize');
        })
        .onUpdate((e) => {
          w.set(Math.max(60, origin.get().width + e.translationX));
          h.set(Math.max(50, origin.get().height + e.translationY));
          resize(id, w.get(), h.get());
        })
        .onFinalize(() => {
          if (started.get()) end();
          started.set(false);
        }),
    [id, start, resize, end, left, top, w, h, origin, started],
  );

  const wiggle = useWiggle(index, editing && !active);

  const card = (
    <View className="flex-1 overflow-hidden rounded-card bg-surface dark:bg-surface-dark">
      {children}
    </View>
  );

  if (!editing) {
    return (
      <Animated.View entering={FadeIn.duration(260)} style={[{ position: 'absolute' }, frameStyle]}>
        {card}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={ZoomIn.duration(220)}
      exiting={ZoomOut.duration(180)}
      style={[{ position: 'absolute' }, frameStyle]}
    >
      <Animated.View
        style={[
          {
            flex: 1,
            shadowColor: '#15181C',
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 14 },
            elevation: active ? 12 : 0,
          },
          liftStyle,
        ]}
      >
        <GestureDetector gesture={moveGesture}>
          <Animated.View style={[{ flex: 1 }, wiggle]}>
            <View
              // Opaque canvas behind the dimmed widget, so the empty-cell
              // matrix only shows in the gaps, not through the widgets.
              className={`flex-1 rounded-[22px] border-2 bg-canvas p-1 dark:bg-canvas-dark ${
                active ? 'border-lime' : 'border-dashed border-ink-3/40 dark:border-ink-3-dark/50'
              }`}
              style={
                Platform.OS === 'web'
                  ? ({ cursor: active ? 'grabbing' : 'grab', userSelect: 'none' } as object)
                  : undefined
              }
            >
              <View pointerEvents="none" style={{ flex: 1, opacity: active ? 1 : 0.45 }}>
                {card}
              </View>
              {active ? null : (
                <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
                  <View className="flex-row items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 dark:bg-ink-dark">
                    <GripVertical size={14} color={dark ? ICON_COLORS.ink : ICON_COLORS.lime} />
                    <meta.icon size={14} color={dark ? ICON_COLORS.ink : '#FFFFFF'} />
                    <Text
                      className="text-[12px] font-semibold text-white dark:text-ink"
                      numberOfLines={1}
                    >
                      {meta.label}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        </GestureDetector>

        {active ? null : (
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('remove', { name: meta.label })}
            className="absolute -left-2 -top-2 h-7 w-7 items-center justify-center rounded-full bg-danger active:opacity-80 dark:bg-danger-dark"
          >
            <Minus size={16} color="#FFFFFF" strokeWidth={3} />
          </Pressable>
        )}

        <GestureDetector gesture={resizeGesture}>
          <View
            accessibilityLabel={t('home:editor.resize', { name: meta.label })}
            className="absolute -bottom-2 -right-2 h-8 w-8 items-center justify-center rounded-full bg-lime"
            style={Platform.OS === 'web' ? ({ cursor: 'nwse-resize' } as object) : undefined}
          >
            <MoveDiagonal2 size={15} color={ICON_COLORS.ink} strokeWidth={2.5} />
          </View>
        </GestureDetector>
      </Animated.View>
    </Animated.View>
  );
}

/* ---------------------------------------------------------------------------
 * Edit-mode decoration
 * ------------------------------------------------------------------------- */

/** The empty matrix behind the widgets: one dashed cell per slot. */
function MatrixCells({
  cols,
  rows,
  cellW,
  gap,
}: {
  cols: number;
  rows: number;
  cellW: number;
  gap: number;
}) {
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push(
        <View
          key={`${x}-${y}`}
          pointerEvents="none"
          className="absolute rounded-2xl border border-dashed border-ink-3/25 dark:border-ink-3-dark/30"
          style={{ left: x * (cellW + gap), top: y * (ROW_H + gap), width: cellW, height: ROW_H }}
        />,
      );
    }
  }
  return <>{cells}</>;
}

/** Where the widget being moved or resized will land. */
function DropSlot({ rect, label }: { rect: Rect; label: string }) {
  return (
    <View
      pointerEvents="none"
      className="absolute items-center justify-center rounded-[22px] border-2 border-dashed border-lime-ink bg-lime-tint/60 dark:border-lime-ink-dark dark:bg-lime-tint-dark/60"
      style={rect}
    >
      <Text className="text-sm font-bold text-lime-ink dark:text-lime-ink-dark">{label}</Text>
    </View>
  );
}

/** Stand-in for a widget that only shows up when it has something (the pending/upcoming reminders). */
export function DormantWidget({ itemKey }: { itemKey: HomeLayoutItem }) {
  const { t } = useTranslation('home');
  const meta = useWidgetMeta()(itemKey);
  return (
    <View className="flex-1 flex-row items-center gap-3 p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
        <meta.icon size={18} color={ICON_COLORS.limeInk} />
      </View>
      <Text className="flex-1 text-xs text-ink-2 dark:text-ink-2-dark">{t('editor.dormant')}</Text>
    </View>
  );
}

/** The wiggle of a phone's home screen in edit mode — small, and off with reduced motion. */
function useWiggle(index: number, on: boolean) {
  const reduced = useReducedMotion();
  const angle = useSharedValue(0);
  useEffect(() => {
    if (!on || reduced) {
      cancelAnimation(angle);
      angle.set(withTiming(0, { duration: 120 }));
      return;
    }
    const a = 0.4;
    // Staggered start so neighbors don't wiggle in lockstep.
    angle.set(
      withDelay(
        (index % 3) * 60,
        withRepeat(
          withSequence(withTiming(-a, { duration: 140 }), withTiming(a, { duration: 140 })),
          -1,
          true,
        ),
      ),
    );
    return () => cancelAnimation(angle);
  }, [on, reduced, index, angle]);
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get()}deg` }] }));
}
