import { ICON_COLORS } from '@repo/ui';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter, type Tabs } from 'expo-router';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import type { ComponentProps, ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionIcon } from './action-icon';

type FloatingTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export interface TabBarAction {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
}

// Split in two so the screens that only *set* the action (every detail
// screen calling `useTabBarAction`) don't re-render each time it changes —
// only the navbar button reads the current value.
const TabBarActionContext = createContext<TabBarAction | null>(null);
const SetTabBarActionContext = createContext<(action: TabBarAction | null) => void>(() => {});

/**
 * Backs the navbar's single right-side action slot — one circle total,
 * never a separate floating button stacked above it. List screens leave it
 * alone and get the default "+" (nuevo movimiento); a detail screen with
 * its own primary action (e.g. "editar cuenta") registers it here instead
 * of rendering its own `Fab`.
 */
export function TabBarActionProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<TabBarAction | null>(null);
  return (
    <SetTabBarActionContext.Provider value={setAction}>
      <TabBarActionContext.Provider value={action}>{children}</TabBarActionContext.Provider>
    </SetTabBarActionContext.Provider>
  );
}

/**
 * Registers this screen's primary action in the navbar while it's focused.
 * Pass `null` (e.g. while the record is still loading or wasn't found) to
 * leave the navbar's default ("+" nuevo movimiento) in place instead of a
 * dead button — a screen with an early-return loading/not-found state can
 * still call this unconditionally, before that return, without needing a
 * real action yet.
 *
 * Uses focus, not mount — stacks and tabs keep screens mounted-but-inactive
 * behind whatever's pushed on top of them, so a plain mount/unmount
 * `useEffect` would leave a stale action registered once another screen is
 * on top. Reverts to the navbar's default on blur.
 *
 * Callers pass a fresh `onPress` closure every render (it closes over
 * route params/record ids), so it can't sit in the focus-effect's own
 * dependency array — that would re-subscribe (and re-render the navbar's
 * provider) on every single render of the calling screen, not just on
 * focus/blur. A ref holds the latest action instead; the effect itself
 * only depends on `icon`/`accessibilityLabel`, which are stable for a
 * given screen, so it only (re)runs on actual focus changes.
 */
export function useTabBarAction(action: TabBarAction | null) {
  const setAction = useContext(SetTabBarActionContext);
  const actionRef = useRef(action);
  // Keeping this ref fresh is a side effect (even though it's cheap), not
  // part of rendering — writing it directly in the render body is what
  // react-hooks/refs objects to, since a render that's thrown away by
  // React (concurrent rendering, Strict Mode's double-invoke) would still
  // have mutated it.
  useEffect(() => {
    actionRef.current = action;
  });

  const icon = action?.icon;
  const accessibilityLabel = action?.accessibilityLabel;

  useFocusEffect(
    useCallback(() => {
      if (!icon || !accessibilityLabel) {
        setAction(null);
        return;
      }
      setAction({ icon, accessibilityLabel, onPress: () => actionRef.current?.onPress() });
      return () => setAction(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [icon, accessibilityLabel]),
  );
}

// No spring here on purpose: a spring's overshoot made a closing capsule
// dip below its collapsed width and back, and since the bar spreads its
// tabs with `space-between`, every icon jittered along with it.
const TAB_TIMING = { duration: 260, easing: Easing.out(Easing.cubic) };
const PRESS_SPRING = { damping: 14, stiffness: 300, mass: 0.6 };

const BAR_HEIGHT = 60;
const BAR_PADDING = 6;
const ITEM_HEIGHT = BAR_HEIGHT - BAR_PADDING * 2;
// Width of a collapsed (icon-only) tab.
const ICON_SLOT = 48;
const ICON_SIZE = 22;
// Inside the expanded lime capsule: side padding and the icon-to-label gap.
const CAPSULE_PADDING_X = 16;
const LABEL_GAP = 8;
const BAR_TOP_GAP = 6;
const BAR_BOTTOM_GAP = 20;
const ACTION_GAP = 10;

// Lime with zero alpha — the capsule's color when collapsed, so
// `interpolateColor` fades the same hue in instead of passing through gray.
const LIME_CLEAR = 'rgba(185, 242, 39, 0)';
const INACTIVE_ICON = ICON_COLORS.ink2Dark;

// Form screens nested inside a tab (crear/editar, the budget wizard, the
// import flow) have their own primary button pinned at the bottom, which
// the floating bar would cover — the bar slides away while one is focused.
const FORM_ROUTE = /(^|\/)(new|edit|import)(\/|$)/;

type NavRoute = { name: string; state?: { index?: number; routes: NavRoute[] } };

/** Whether the screen showing inside this tab (at any nesting depth) is a form. */
function isFormRoute(route: NavRoute): boolean {
  let current: NavRoute | undefined = route;
  while (current) {
    if (FORM_ROUTE.test(current.name)) return true;
    const nested: NavRoute['state'] = current.state;
    current = nested ? nested.routes[nested.index ?? nested.routes.length - 1] : undefined;
  }
  return false;
}

const SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  android: { elevation: 14 },
  default: {},
});

/**
 * The navbar's primary action, as its own floating circle to the right of
 * the bar (same height, aligned) — a separate element, not a 5th tab.
 * Defaults to "nuevo movimiento"; a focused screen can swap the icon/label/
 * target via `useTabBarAction`.
 */
function TabBarActionButton() {
  const router = useRouter();
  const action = useContext(TabBarActionContext);
  const scale = useSharedValue(1);

  const Icon = action?.icon ?? Plus;
  const accessibilityLabel = action?.accessibilityLabel ?? 'Nuevo movimiento';
  const handleAction = action?.onPress ?? (() => router.push('/(app)/new-transaction'));

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // react-hooks/immutability doesn't know Reanimated's `useSharedValue` —
  // `.value` assignment from a JS-thread event handler is the library's own
  // documented pattern, not a React-tracked value being mutated.
  const onPressIn = () => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(0.9, PRESS_SPRING);
  };
  const onPressOut = () => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(1, PRESS_SPRING);
  };
  const onPress = () => {
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSequence(withSpring(1.06, PRESS_SPRING), withSpring(1, PRESS_SPRING));
    handleAction();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={6}
    >
      <Animated.View
        style={[
          {
            width: BAR_HEIGHT,
            height: BAR_HEIGHT,
            borderRadius: BAR_HEIGHT / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ICON_COLORS.lime,
          },
          SHADOW,
          style,
        ]}
      >
        <ActionIcon icon={Icon} color={ICON_COLORS.ink} size={24} strokeWidth={2.5} />
      </Animated.View>
    </Pressable>
  );
}

/**
 * Total visual footprint of the floating bar below — screens read this
 * (via `Screen`'s `FloatingTabBarInsetContext`) to pad their own scroll
 * content so the last items can scroll clear of the overlay instead of
 * hiding under it. Kept in one place so it can never drift from the
 * dimensions `FloatingTabBar` actually renders below.
 */
export function useFloatingTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + BAR_TOP_GAP + BAR_BOTTOM_GAP + insets.bottom;
}

/**
 * One tab. Collapsed it's just the icon; focused it grows into a lime
 * capsule with the icon + label in ink. `progress` (0 → 1) drives the
 * width, the capsule color and the label fade together on the UI thread.
 */
function TabItem({
  focused,
  label,
  labelWidth,
  renderIcon,
  onPressIn,
  onPress,
}: {
  focused: boolean;
  label: string;
  /** The label's measured width, already capped to what fits in the bar. */
  labelWidth: number;
  renderIcon: (color: string, focused: boolean) => ReactNode;
  onPressIn: () => void;
  onPress: () => void;
}) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, TAB_TIMING);
  }, [focused, progress]);

  const expandedWidth = CAPSULE_PADDING_X * 2 + ICON_SIZE + LABEL_GAP + labelWidth;

  const capsuleStyle = useAnimatedStyle(() => ({
    width: ICON_SLOT + (expandedWidth - ICON_SLOT) * progress.value,
    backgroundColor: interpolateColor(progress.value, [0, 1], [LIME_CLEAR, ICON_COLORS.lime]),
  }));

  // The label only shows once the capsule has opened most of the way, so it
  // never reads as clipped mid-word while the width is still small.
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.55, 1], [0, 1], Extrapolation.CLAMP),
    width: labelWidth * progress.value,
    marginLeft: LABEL_GAP * progress.value,
  }));

  // The icon's color can't be animated directly, so both versions are
  // stacked and cross-faded with the capsule — switching the color at once
  // made the newly selected icon flash out (ink on the still-clear capsule,
  // i.e. ink on ink) before the lime filled in behind it.
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const inactiveIconStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPressIn={onPressIn}
      onPress={onPress}
    >
      <Animated.View
        style={[
          {
            height: ITEM_HEIGHT,
            borderRadius: ITEM_HEIGHT / 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          capsuleStyle,
        ]}
      >
        <View style={{ width: ICON_SIZE, height: ICON_SIZE }}>
          <Animated.View style={[{ position: 'absolute' }, inactiveIconStyle]}>
            {renderIcon(INACTIVE_ICON, false)}
          </Animated.View>
          <Animated.View style={[{ position: 'absolute' }, activeIconStyle]}>
            {renderIcon(ICON_COLORS.ink, true)}
          </Animated.View>
        </View>
        <Animated.View style={[{ overflow: 'hidden' }, labelStyle]}>
          <Text
            numberOfLines={1}
            style={{ width: labelWidth, fontSize: 14, fontWeight: '700', color: ICON_COLORS.ink }}
          >
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Custom floating tab bar — `position: absolute` over the scene content,
 * so screens scroll underneath it instead of stopping above a reserved gap.
 * Because React Navigation no longer reserves real layout space for it,
 * `AppLayout` provides `useFloatingTabBarHeight()` through
 * `FloatingTabBarInsetContext` so `Screen` can pad content to match.
 *
 * An ink pill of icons where the selected tab opens into a lime capsule
 * with its name, plus the lime action circle floating on its own to the
 * right.
 */
export function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // Each label's natural width (measured once, offscreen) and the bar's
  // inner width — together they decide how wide the open capsule can get
  // without pushing the other icons out of the bar.
  const [labelWidths, setLabelWidths] = useState<Record<string, number>>({});
  const [barInnerWidth, setBarInnerWidth] = useState(0);
  const maxLabelWidth = Math.max(
    0,
    barInnerWidth -
      (state.routes.length - 1) * ICON_SLOT -
      CAPSULE_PADDING_X * 2 -
      ICON_SIZE -
      LABEL_GAP,
  );

  // The tab the user just touched, shown as selected right away — before
  // React Navigation has committed the switch (which means rendering the
  // destination screen). `base` is the navigator index it was pressed from:
  // once the real index moves on (or something else navigates), the
  // optimistic value no longer applies and the navigator's own index wins.
  const [optimistic, setOptimistic] = useState<{ target: number; base: number } | null>(null);
  const displayIndex =
    optimistic && optimistic.base === state.index ? optimistic.target : state.index;
  // Which tab the current touch started on, and whether it was already the
  // selected one then — `onPress` (on release) needs the state from touch-down,
  // not whatever the switch has changed it to since.
  const pressStart = useRef<{ index: number; wasFocused: boolean } | null>(null);

  const hidden = isFormRoute(state.routes[state.index] as NavRoute);
  const hideOffset = BAR_HEIGHT + BAR_TOP_GAP + BAR_BOTTOM_GAP + insets.bottom;
  const hideProgress = useSharedValue(hidden ? 1 : 0);
  useEffect(() => {
    hideProgress.value = withTiming(hidden ? 1 : 0, TAB_TIMING);
  }, [hidden, hideProgress]);
  const hideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hideOffset * hideProgress.value }],
  }));

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'box-none'}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: ACTION_GAP,
          paddingHorizontal: 16,
          paddingTop: BAR_TOP_GAP,
          paddingBottom: insets.bottom + BAR_BOTTOM_GAP,
        },
        hideStyle,
      ]}
    >
      {/* Offscreen label measurement — wide, invisible, never interactive. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, top: 0, width: 1000, opacity: 0 }}
      >
        {state.routes.map((route) => (
          <Text
            key={route.key}
            onLayout={(e) => {
              const width = Math.ceil(e.nativeEvent.layout.width);
              setLabelWidths((prev) =>
                prev[route.key] === width ? prev : { ...prev, [route.key]: width },
              );
            }}
            style={{ alignSelf: 'flex-start', fontSize: 14, fontWeight: '700' }}
          >
            {descriptors[route.key].options.title ?? route.name}
          </Text>
        ))}
      </View>

      <View
        onLayout={(e) => setBarInnerWidth(e.nativeEvent.layout.width - BAR_PADDING * 2)}
        style={[
          {
            flex: 1,
            height: BAR_HEIGHT,
            borderRadius: BAR_HEIGHT / 2,
            padding: BAR_PADDING,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: ICON_COLORS.ink,
            borderWidth: dark ? 1 : 0,
            borderColor: ICON_COLORS.lineDark,
          },
          SHADOW,
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = displayIndex === index;
          const label = options.title ?? route.name;

          // Fires on touch-down, like a native tab bar — the release
          // (`onPress`) comes ~100ms later, which read as lag. Order
          // matters: the capsule starts opening and the icons repaint
          // first; the navigation (the expensive part — rendering the
          // destination) is deferred one frame so it can't hold that
          // feedback back.
          const switchTab = () => {
            setOptimistic({ target: index, base: state.index });
            if (Platform.OS !== 'web')
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            requestAnimationFrame(() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (event.defaultPrevented) setOptimistic(null);
              else navigation.navigate(route.name);
            });
          };

          const onPressIn = () => {
            pressStart.current = { index, wasFocused: focused };
            if (!focused) switchTab();
          };

          const onPress = () => {
            const start = pressStart.current;
            pressStart.current = null;
            if (start?.index === index) {
              // Re-tap of the tab that was already selected: keep React
              // Navigation's usual tabPress (scroll-to-top listeners etc.).
              if (start.wasFocused) {
                navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              }
              return;
            }
            // No touch-down came first — a screen reader's activate action
            // only fires `onPress`.
            if (!focused) switchTab();
          };

          return (
            <TabItem
              key={route.key}
              focused={focused}
              label={label}
              labelWidth={Math.min(labelWidths[route.key] ?? 0, maxLabelWidth)}
              renderIcon={(color, iconFocused) =>
                options.tabBarIcon?.({ focused: iconFocused, color, size: ICON_SIZE }) ?? null
              }
              onPressIn={onPressIn}
              onPress={onPress}
            />
          );
        })}
      </View>

      <TabBarActionButton />
    </Animated.View>
  );
}
