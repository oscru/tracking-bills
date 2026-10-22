import { useNotifications, useProfile, useSession, useSignOut } from '@repo/core/hooks';
import { GradientFill, ICON_COLORS } from '@repo/ui';
import { useRouter, useSegments, type Href } from 'expo-router';
import {
  Bell,
  BellRing,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Plus,
  Shapes,
  SlidersHorizontal,
  Tag,
  Target,
  UserRound,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useDismiss } from '../design/use-dismiss';
import { useCurrentTabBarAction, type AppTab } from './floating-tab-bar';

export const DESKTOP_SIDEBAR_WIDTH = 248;
/** Collapsed: an icon rail. */
export const DESKTOP_SIDEBAR_COLLAPSED_WIDTH = 76;

const INK = ICON_COLORS.ink;
const ON_INK = '#F2F3F5';
const ON_INK_MUTED = '#9BA1A8';
const HOVER = 'rgba(255,255,255,0.06)';
const SUB_ACTIVE = 'rgba(255,255,255,0.09)';
const DIVIDER = 'rgba(255,255,255,0.08)';
// Rough height of the Opciones flyout (title + 10 rows), to keep it on screen.
const FLYOUT_HEIGHT = 470;

// The collapsed/expanded choice is a per-browser convenience — remembered in
// localStorage, and the sidebar works fine (expanded) when that's unavailable.
const COLLAPSED_KEY = 'genobills.sidebar.collapsed';
const TOGGLE_MS = 220;
// Header heights: one row (logo · name · bell) when expanded; the rail
// stacks the bell under the logo (36 + 10 gap + 32).
const HEADER_HEIGHT = 36;
/**
 * Ease-out cubic, with its input clamped: on web, Reanimated's first frame
 * can come with a time slightly before the start, and the plain curve turned
 * that into a step the wrong way (the items twitched up before gliding
 * down).
 */
const easeOut = (t: number) => {
  'worklet';
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
};
const RAIL_HEADER_HEIGHT = 78;

function readCollapsed(): boolean {
  try {
    return globalThis.localStorage?.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    globalThis.localStorage?.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    // Private mode / blocked storage: just don't remember it.
  }
}

/**
 * Opciones' sections, listed right in the sidebar on desktop (the phone shows
 * them as a list screen). Same order and routes as `settings/index.tsx`, except:
 * "Seguridad" (fingerprint/Face ID lock) and "Ver tour de nuevo" are
 * phone-only, and "Preferencias" lives in the user menu at the bottom.
 */
const SETTINGS_ITEMS: {
  segment: string;
  label: string;
  icon: LucideIcon;
  /** Somewhere other than its settings screen. */
  href?: Href;
}[] = [
  { segment: 'accounts', label: 'Cuentas', icon: WalletCards },
  { segment: 'categories', label: 'Categorías', icon: Shapes },
  { segment: 'tags', label: 'Tags', icon: Tag },
  { segment: 'budgets', label: 'Presupuestos', icon: Gauge },
  { segment: 'goals', label: 'Objetivos', icon: Target },
  { segment: 'peers', label: 'Personas', icon: UsersRound },
  // Opens the dashboard's own edit mode (move, resize, add, remove widgets)
  // rather than the phone's widgets-on/off settings screen.
  {
    segment: 'home-layout',
    label: 'Personalizar dashboard',
    icon: LayoutTemplate,
    href: { pathname: '/(app)', params: { edit: '1' } },
  },
  { segment: 'notifications', label: 'Avisos y recordatorios', icon: BellRing },
  { segment: 'import-export', label: 'Importar y exportar', icon: FileSpreadsheet },
];

const hoverBg =
  (active: boolean, activeBg: string | undefined = undefined) =>
  ({ hovered }: { hovered?: boolean }) =>
    active ? activeBg : hovered ? HOVER : 'transparent';

type LabelStyle = ComponentProps<typeof Animated.View>['style'];

/** On desktop, Inicio reads as what it is there: the dashboard. */
function desktopTab(t: AppTab): AppTab {
  return t.name === 'index' ? { ...t, title: 'Dashboard', icon: LayoutDashboard } : t;
}

/** A section inside an expanded group — indented, quieter than a top-level item. */
function SubItem({
  icon: Icon,
  label,
  active = false,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const bg = hoverBg(active, SUB_ACTIVE);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      style={(state: { hovered?: boolean }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 36,
        paddingLeft: 26,
        // Nothing trails the label — tight, so the longer ones
        // ("Personalizar dashboard") fit without truncating.
        paddingRight: 6,
        borderRadius: 12,
        backgroundColor: bg(state),
      })}
    >
      <View>
        <Icon size={17} color={active ? ICON_COLORS.lime : ON_INK_MUTED} strokeWidth={1.9} />
      </View>
      <Text
        selectable={false}
        style={{ color: active ? ICON_COLORS.lime : ON_INK, fontWeight: active ? '700' : '500' }}
        className="flex-1 text-[14px]"
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A sidebar row — lime capsule when active, a soft highlight on hover. Icon-only when collapsed. */
function NavItem({
  icon: Icon,
  label,
  active = false,
  badge,
  expanded,
  collapsed,
  labelStyle,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number;
  /** A group (Opciones): shows a chevron for its open/closed state. */
  expanded?: boolean;
  collapsed: boolean;
  /** Fades the label out as the sidebar narrows (see `labelStyle`). */
  labelStyle: LabelStyle;
  onPress: () => void;
}) {
  const bg = hoverBg(active);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={(state: { hovered?: boolean }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 12,
        height: 44,
        paddingHorizontal: collapsed ? 0 : 12,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: bg(state),
      })}
    >
      {active ? <GradientFill radius={14} /> : null}
      {/* In a View: on web a bare <svg> has no position of its own, so the
      absolutely positioned gradient would paint over it. */}
      <View>
        <Icon size={20} color={active ? INK : ON_INK_MUTED} strokeWidth={active ? 2.25 : 1.75} />
        {collapsed && badge ? (
          <View
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-lime"
            style={{ borderWidth: 2, borderColor: INK }}
          />
        ) : null}
      </View>
      {collapsed ? null : (
        <Animated.View
          style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, labelStyle]}
        >
          <Text
            selectable={false}
            style={{
              color: active ? INK : ON_INK,
              fontWeight: active ? '700' : '500',
              fontSize: 15,
            }}
            className="flex-1"
          >
            {label}
          </Text>
          {expanded != null ? (
            <View>
              {expanded ? (
                <ChevronDown size={16} color={active ? INK : ON_INK_MUTED} />
              ) : (
                <ChevronRight size={16} color={active ? INK : ON_INK_MUTED} />
              )}
            </View>
          ) : null}
          {badge ? (
            <View className="h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1.5">
              <Text selectable={false} className="text-[11px] font-bold text-ink">
                {badge > 9 ? '9+' : badge}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      )}
    </Pressable>
  );
}

/** A small icon button in the sidebar's header (notifications), with an unread badge. */
function HeaderIconButton({
  icon: Icon,
  label,
  active = false,
  badge,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ hovered }: { hovered?: boolean }) => ({
        backgroundColor: active ? SUB_ACTIVE : hovered ? HOVER : 'transparent',
      })}
      className="h-8 w-8 items-center justify-center rounded-lg"
    >
      <View>
        <Icon size={18} color={active ? ICON_COLORS.lime : ON_INK_MUTED} strokeWidth={1.9} />
      </View>
      {badge ? (
        <View
          className="absolute -right-1 -top-1 h-[17px] min-w-[17px] items-center justify-center rounded-full bg-lime px-1"
          style={{ borderWidth: 2, borderColor: INK }}
        >
          <Text selectable={false} className="text-[9px] font-bold text-ink">
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** A row of the user menu (perfil, preferencias, cerrar sesión). */
function MenuItem({
  icon: Icon,
  label,
  danger = false,
  active = false,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  /** The section you're on (Opciones flyout). */
  active?: boolean;
  onPress: () => void;
}) {
  const color = danger ? '#F16A6E' : active ? ICON_COLORS.lime : ON_INK;
  const bg = hoverBg(active, SUB_ACTIVE);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      style={(state: { hovered?: boolean }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 38,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: bg(state),
      })}
    >
      <View>
        <Icon size={17} color={danger || active ? color : ON_INK_MUTED} strokeWidth={1.9} />
      </View>
      <Text
        selectable={false}
        style={{ color, fontWeight: active ? '700' : '500' }}
        className="text-[14px]"
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Desktop web navigation (see `useIsDesktop`): replaces the floating tab
 * bar. Logo, the screen's primary action (the same one the navbar's "+"
 * button shows — "Nuevo movimiento" by default, "Editar…" on a detail
 * screen that registers one via `useTabBarAction`), the sections (Opciones
 * as an expandable group), the notification bell (in the header) and the user menu
 * (perfil, preferencias, cerrar sesión). Collapses to an icon rail.
 */
export function DesktopSidebar({ tabs }: { tabs: AppTab[] }) {
  const router = useRouter();
  const segments = useSegments() as string[];
  const action = useCurrentTabBarAction();
  const { unreadCount } = useNotifications();
  const { data: profile } = useProfile();
  const { user } = useSession();
  const signOut = useSignOut();

  const [collapsed, setCollapsed] = useState(readCollapsed);
  // `collapsed` is where the sidebar is going; `rail` is the layout it
  // draws. The content is always laid out at its full width and the
  // animated width only clips it — so expanding switches to the full layout
  // first and the labels slide into view with the edge, and collapsing
  // keeps them until the edge has covered them, then switches to the rail.
  // Icons sit at the same x in both layouts, so the switch doesn't jump.
  const [rail, setRail] = useState(collapsed);
  const width = useSharedValue(collapsed ? DESKTOP_SIDEBAR_COLLAPSED_WIDTH : DESKTOP_SIDEBAR_WIDTH);
  useEffect(() => {
    width.set(
      withTiming(collapsed ? DESKTOP_SIDEBAR_COLLAPSED_WIDTH : DESKTOP_SIDEBAR_WIDTH, {
        duration: TOGGLE_MS,
        easing: easeOut,
      }),
    );
    // Expanding already switched to the full layout (in `toggleCollapsed`).
    if (!collapsed) return;
    const t = setTimeout(() => setRail(true), TOGGLE_MS);
    return () => clearTimeout(t);
  }, [collapsed, width]);
  const widthStyle = useAnimatedStyle(() => ({ width: width.get() }));
  // Text fades with the width: gone well before the edge reaches the icons
  // (the full layout, clipped to the rail, would otherwise still show the
  // first letters of each label until the rail takes over), and back in as
  // it widens.
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      width.get(),
      [DESKTOP_SIDEBAR_COLLAPSED_WIDTH + 24, DESKTOP_SIDEBAR_COLLAPSED_WIDTH + 110],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  // The rail's taller header (the bell drops under the logo) grows with the
  // width, so the items below glide down instead of jumping when the rail
  // takes over; the bell then fades into the room already made for it.
  const headerHeight = useSharedValue(collapsed ? RAIL_HEADER_HEIGHT : HEADER_HEIGHT);
  useEffect(() => {
    headerHeight.set(
      withTiming(collapsed ? RAIL_HEADER_HEIGHT : HEADER_HEIGHT, {
        duration: TOGGLE_MS,
        easing: easeOut,
      }),
    );
  }, [collapsed, headerHeight]);
  const headerStyle = useAnimatedStyle(() => ({ height: headerHeight.get() }));
  const [menuOpen, setMenuOpen] = useState(false);
  // Escape or a click outside the menu (and outside its toggle) closes it.
  const menuRef = useRef<View>(null);
  const userButtonRef = useRef<View>(null);
  useDismiss(menuOpen, () => setMenuOpen(false), [menuRef, userButtonRef]);

  // Collapsed rail: Opciones' sections open in a flyout beside it (no room
  // in the rail itself). Drawn at the sidebar's level — the nav list scrolls,
  // and would clip it — at the height of the Opciones button, measured on
  // open. Escape or a click anywhere else closes it.
  const [flyoutTop, setFlyoutTop] = useState<number | null>(null);
  const { height: windowHeight } = useWindowDimensions();
  const optionsRef = useRef<View>(null);
  const flyoutRef = useRef<View>(null);
  const closeFlyout = () => setFlyoutTop(null);
  useDismiss(flyoutTop != null, closeFlyout, [flyoutRef, optionsRef]);
  const toggleFlyout = () => {
    if (flyoutTop != null) return closeFlyout();
    // Aligned with the button, but kept inside a short window.
    optionsRef.current?.measureInWindow((_x, y) =>
      setFlyoutTop(Math.max(8, Math.min(y, windowHeight - FLYOUT_HEIGHT - 8))),
    );
  };
  const toggleCollapsed = () => {
    const next = !collapsed;
    writeCollapsed(next);
    setCollapsed(next);
    if (!next) setRail(false);
    setMenuOpen(false);
    setFlyoutTop(null);
  };

  // Same reading of the route as the navbar: `(app) › (tabs) › <tab>`; while
  // something is open over the tabs, keep highlighting the tab you came from.
  const onTabs = segments[1] === '(tabs)';
  const activeName = onTabs ? (segments[2] ?? 'index') : null;
  const [lastTab, setLastTab] = useState(activeName ?? 'index');
  if (activeName && activeName !== lastTab) setLastTab(activeName);
  const shownTab = activeName ?? lastTab;
  const onNotifications = segments[1] === 'notifications';

  // Opciones opens as a group: it opens when you go into it and closes when
  // you leave, and you can toggle it in between.
  const inSettings = !onNotifications && shownTab === 'settings';
  const settingsSection = onTabs && segments[2] === 'settings' ? (segments[3] ?? null) : null;
  const [settingsOpen, setSettingsOpen] = useState(inSettings);
  const [wasInSettings, setWasInSettings] = useState(inSettings);
  if (inSettings !== wasInSettings) {
    setWasInSettings(inSettings);
    setSettingsOpen(inSettings);
  }

  const bellButton = (
    <HeaderIconButton
      icon={Bell}
      label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
      active={onNotifications}
      badge={unreadCount}
      onPress={() => router.push('/(app)/notifications' as Href)}
    />
  );

  const ActionIcon = action?.icon ?? Plus;
  const actionLabel = action?.accessibilityLabel ?? 'Nuevo movimiento';
  const runAction = action?.onPress ?? (() => router.push('/(app)/new-transaction'));

  const name = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Tu cuenta';
  const go = (href: Href) => {
    setMenuOpen(false);
    router.push(href);
  };

  const menu = (
    <View
      ref={menuRef}
      accessibilityRole="menu"
      className="gap-0.5 rounded-2xl p-1.5"
      style={[
        { backgroundColor: '#24282D', borderWidth: 1, borderColor: DIVIDER },
        rail
          ? // Floats to the right of the rail, above the content.
            {
              position: 'absolute',
              left: DESKTOP_SIDEBAR_COLLAPSED_WIDTH - 4,
              bottom: 28,
              width: 220,
              zIndex: 20,
            }
          : // Floats right above the user row, over the list — takes no space.
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '100%',
              marginBottom: 8,
              zIndex: 20,
            },
      ]}
    >
      <MenuItem icon={UserRound} label="Mi perfil" onPress={() => go('/(app)/profile' as Href)} />
      <MenuItem
        icon={SlidersHorizontal}
        label="Preferencias"
        onPress={() => go('/(app)/settings/preferences' as Href)}
      />
      <View className="mx-2 my-1 h-px" style={{ backgroundColor: DIVIDER }} />
      <MenuItem
        icon={LogOut}
        label="Cerrar sesión"
        danger
        onPress={() => {
          setMenuOpen(false);
          signOut.mutate();
        }}
      />
    </View>
  );

  return (
    <Animated.View
      // Navigation, not content: rapid clicks (toggling Opciones) shouldn't
      // select the labels. Also set per <Text>, which can re-enable it on web.
      // zIndex: the collapsed user menu floats over the content beside it.
      // Plain styles, not `className`: NativeWind skips `Animated.View`.
      style={[{ height: '100%', backgroundColor: INK, userSelect: 'none', zIndex: 10 }, widthStyle]}
    >
      {/* The clip: the animated width reveals or hides the content, which
      keeps its own (final) width — so labels never squeeze or wrap. */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <View
          style={{
            width: rail ? DESKTOP_SIDEBAR_COLLAPSED_WIDTH : DESKTOP_SIDEBAR_WIDTH,
            height: '100%',
            paddingTop: 24,
            paddingBottom: 16,
            paddingHorizontal: rail ? 12 : 16,
          }}
        >
          <Animated.View style={[{ marginBottom: 28 }, headerStyle]}>
            <View className={`items-center gap-2.5 ${rail ? 'flex-col' : 'flex-row px-1'}`}>
              {/* The logo (and name) take you home, like most dashboards. */}
              <Pressable
                onPress={() => router.navigate('/(app)')}
                accessibilityRole="link"
                accessibilityLabel="Ir a Inicio"
                className={`items-center gap-2.5 active:opacity-70 ${rail ? '' : 'flex-1 flex-row'}`}
              >
                <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-[11px]">
                  <GradientFill radius={11} />
                  <Text selectable={false} className="text-lg">
                    💸
                  </Text>
                </View>
                {rail ? null : (
                  <Animated.View style={[{ flex: 1 }, labelStyle]}>
                    <Text
                      selectable={false}
                      style={{ color: ON_INK }}
                      className="text-[17px] font-extrabold tracking-tight"
                    >
                      Genobills
                    </Text>
                  </Animated.View>
                )}
              </Pressable>
              {/* The bell sits with the sidebar's own controls — the usual dashboard
        spot — instead of being one more section in the navigation. */}
              {/* On the rail, it fades into the room the header grew for it. */}
              {rail ? (
                <Animated.View entering={FadeIn.duration(180)}>{bellButton}</Animated.View>
              ) : (
                <Animated.View style={labelStyle}>{bellButton}</Animated.View>
              )}
            </View>
          </Animated.View>

          <Pressable
            onPress={runAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={({ hovered }: { hovered?: boolean }) => ({ opacity: hovered ? 0.92 : 1 })}
            // Left-aligned (icon at the rail's x), so the icon doesn't shift
            // when the rail takes over; centered on the rail itself.
            className={`mb-6 h-12 flex-row items-center gap-2.5 overflow-hidden rounded-[14px] ${
              rail ? 'justify-center' : 'px-3'
            }`}
          >
            <GradientFill radius={14} />
            <View>
              <ActionIcon size={20} color={INK} strokeWidth={2.4} />
            </View>
            {rail ? null : (
              <Animated.View style={labelStyle}>
                <Text
                  selectable={false}
                  className="text-[15px] font-extrabold text-ink"
                  numberOfLines={1}
                >
                  {actionLabel}
                </Text>
              </Animated.View>
            )}
          </Pressable>

          {/* Scrolls when the Opciones group makes the list taller than the window. */}
          <ScrollView className="-mx-1 flex-1 px-1" showsVerticalScrollIndicator={false}>
            <View className="gap-1">
              {tabs.map(desktopTab).map((t) =>
                t.name === 'settings' ? (
                  <View key={t.name} className="gap-0.5">
                    <View ref={optionsRef}>
                      <NavItem
                        icon={t.icon}
                        label={t.title}
                        collapsed={rail}
                        labelStyle={labelStyle}
                        active={inSettings && (rail || settingsSection == null)}
                        expanded={settingsOpen}
                        // Only opens/closes the list — pick a section from it. On
                        // the rail, the list opens as a flyout beside it.
                        onPress={() => (rail ? toggleFlyout() : setSettingsOpen((open) => !open))}
                      />
                    </View>
                    {settingsOpen && !rail ? (
                      <Animated.View style={labelStyle} className="gap-0.5 pb-1 pt-0.5">
                        {SETTINGS_ITEMS.map((item) => (
                          <SubItem
                            key={item.segment}
                            icon={item.icon}
                            label={item.label}
                            active={settingsSection === item.segment}
                            onPress={() =>
                              router.navigate(
                                item.href ?? (`/(app)/settings/${item.segment}` as Href),
                              )
                            }
                          />
                        ))}
                      </Animated.View>
                    ) : null}
                  </View>
                ) : (
                  <NavItem
                    key={t.name}
                    icon={t.icon}
                    label={t.title}
                    collapsed={rail}
                    labelStyle={labelStyle}
                    active={!onNotifications && shownTab === t.name}
                    onPress={() => router.navigate(t.href)}
                  />
                ),
              )}
            </View>
          </ScrollView>

          <View className="mb-3 mt-2 h-px" style={{ backgroundColor: DIVIDER }} />

          {/* Anchor for the floating menu. */}
          <View style={{ position: 'relative' }}>
            {menuOpen && !rail ? menu : null}

            <Pressable
              ref={userButtonRef}
              onPress={() => setMenuOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel="Tu cuenta"
              accessibilityState={{ expanded: menuOpen }}
              style={({ hovered }: { hovered?: boolean }) => ({
                backgroundColor: menuOpen ? SUB_ACTIVE : hovered ? HOVER : 'transparent',
              })}
              className={`flex-row items-center rounded-[14px] py-2 ${
                rail ? 'justify-center px-0' : 'gap-3 px-1'
              }`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-lime">
                <Text selectable={false} className="text-[15px] font-bold text-ink">
                  {name[0]?.toUpperCase()}
                </Text>
              </View>
              {rail ? null : (
                <Animated.View
                  style={[
                    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
                    labelStyle,
                  ]}
                >
                  <View className="flex-1">
                    <Text
                      selectable={false}
                      style={{ color: ON_INK }}
                      className="text-sm font-semibold"
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    <Text
                      selectable={false}
                      style={{ color: ON_INK_MUTED }}
                      className="text-xs"
                      numberOfLines={1}
                    >
                      {user?.email}
                    </Text>
                  </View>
                  <View>
                    {menuOpen ? (
                      <ChevronDown size={16} color={ON_INK_MUTED} />
                    ) : (
                      <ChevronUp size={16} color={ON_INK_MUTED} />
                    )}
                  </View>
                </Animated.View>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Outside the clip — these float beyond the rail's edge. */}
      {/* Collapse toggle: a small arrow on the sidebar's edge — not a row
      inside it, where it read as one more section and got clicked by
      mistake. Sits level with the logo; the sidebar's zIndex keeps the half
      over the content clickable. */}
      <View style={{ position: 'absolute', top: 30, right: -12, zIndex: 1 }}>
        <Pressable
          onPress={toggleCollapsed}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          style={({ hovered }: { hovered?: boolean }) => ({
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: hovered ? '#30353B' : '#24282D',
            borderWidth: 1,
            borderColor: DIVIDER,
          })}
        >
          <View style={collapsed ? { transform: [{ rotate: '180deg' }] } : undefined}>
            <ChevronLeft size={14} color={ON_INK} />
          </View>
        </Pressable>
      </View>
      {rail && flyoutTop != null ? (
        <View
          ref={flyoutRef}
          accessibilityRole="menu"
          className="gap-0.5 rounded-2xl p-1.5"
          style={{
            position: 'absolute',
            left: DESKTOP_SIDEBAR_COLLAPSED_WIDTH - 4,
            top: flyoutTop,
            width: 240,
            zIndex: 30,
            backgroundColor: '#24282D',
            borderWidth: 1,
            borderColor: DIVIDER,
          }}
        >
          <Text
            selectable={false}
            style={{ color: ON_INK_MUTED }}
            className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider"
          >
            Opciones
          </Text>
          {SETTINGS_ITEMS.map((item) => (
            <MenuItem
              key={item.segment}
              icon={item.icon}
              label={item.label}
              active={settingsSection === item.segment}
              onPress={() => {
                closeFlyout();
                router.navigate(item.href ?? (`/(app)/settings/${item.segment}` as Href));
              }}
            />
          ))}
        </View>
      ) : null}
      {menuOpen && rail ? menu : null}
    </Animated.View>
  );
}
