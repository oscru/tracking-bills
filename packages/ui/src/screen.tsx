import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge, type Edges } from 'react-native-safe-area-context';

import { useFloatingTabBarInset } from './floating-tab-bar-inset';
import {
  DESKTOP_CONTENT_WIDTH,
  useIsDesktop,
  useIsWideDesktop,
  type ScreenWidth,
} from './layout-mode';
import { useKeyboardHeight } from './use-keyboard-height';

function includesBottomEdge(edges: Edges): boolean {
  if (Array.isArray(edges)) return (edges as readonly Edge[]).includes('bottom');
  return (edges as Partial<Record<Edge, unknown>>).bottom !== 'off';
}

export interface ScreenProps {
  children: ReactNode;
  /** Extra classes on the inner padded container. */
  className?: string;
  edges?: Edges;
  /** Center children on the cross axis (handy for auth screens). */
  center?: boolean;
  /** Wrap children in a keyboard-aware ScrollView (forms — not list screens). */
  scroll?: boolean;
  /**
   * Desktop web only: how wide the content column gets — `wide` for
   * dashboards and lists, `narrow` (default) for forms and details. Phones
   * and narrow windows always use the mobile column.
   */
  width?: ScreenWidth;
  /**
   * `scroll` only: pinned above the scrolling content, in the same column
   * (a page header that stays put while the rest scrolls). The scroll area
   * itself spans the whole screen, so the wheel/touch works in the side
   * gutters too — not only over the column.
   */
  header?: ReactNode;
  /** `scroll` only: e.g. off while something on the page is being dragged. */
  scrollEnabled?: boolean;
}

export function Screen({
  children,
  className = '',
  edges = ['top', 'bottom'],
  center = false,
  scroll = false,
  width = 'narrow',
  header,
  scrollEnabled = true,
}: ScreenProps) {
  const desktop = useIsDesktop();
  const wide = useIsWideDesktop();
  // Android only (0 on iOS) — see `useKeyboardHeight`'s doc comment for why
  // `KeyboardAvoidingView`'s own behaviors aren't used there.
  const keyboardHeight = useKeyboardHeight();
  // Inside the tabs, the floating tab bar overlays the bottom of the screen —
  // a `scroll` screen's content gets room to scroll fully clear of it.
  const tabBarInset = useFloatingTabBarInset();

  // Web: a centered column — the phone-width one, or on desktop a wider one
  // (set as a style: the width is dynamic) with roomier padding — a bit less
  // of it on a compact (tablet) desktop, where every pixel of width counts.
  const web = Platform.OS === 'web' ? 'mx-auto w-full' : '';
  const columnStyle =
    Platform.OS !== 'web'
      ? undefined
      : desktop
        ? {
            maxWidth: DESKTOP_CONTENT_WIDTH[width],
            paddingHorizontal: wide ? 40 : 24,
            paddingTop: wide ? 32 : 24,
          }
        : { maxWidth: 480 };

  // Decorative breathing room, separate from `SafeAreaView`'s `edges`
  // (system chrome only). A screen that drops `'bottom'` already has
  // something else owning that edge — its own sticky footer, or a
  // floating tab bar meant to overlay it (content should scroll behind
  // it, not stop short of it — no extra padding added for that here).
  const vertical = `pt-3 ${includesBottomEdge(edges) ? 'pb-4' : 'pb-1'}`;

  const content = scroll ? (
    <>
      {header ? (
        <View className={`px-5 pt-3 ${web}`} style={columnStyle}>
          {header}
        </View>
      ) : null}
      <ScrollView
        className="flex-1"
        contentContainerClassName={`grow px-5 ${vertical} ${web} ${center ? 'justify-center' : ''} ${className}`}
        contentContainerStyle={[
          columnStyle,
          // Under a pinned header: just a gap, not the page's top padding again.
          header ? { paddingTop: 20 } : undefined,
          tabBarInset > 0 ? { paddingBottom: tabBarInset + 24 } : undefined,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {children}
      </ScrollView>
    </>
  ) : (
    <View
      className={`flex-1 px-5 ${vertical} ${web} ${center ? 'justify-center' : ''} ${className}`}
      style={columnStyle}
    >
      {children}
    </View>
  );

  // iOS: `KeyboardAvoidingView`'s own `"padding"` behavior (reliable there —
  // it measures its own layout correctly). Android: manual `paddingBottom`
  // from `useKeyboardHeight` instead — `KeyboardAvoidingView`'s behaviors
  // depend on that same layout measurement, which doesn't reliably fire
  // inside an Expo Router native-stack screen on Android (see
  // `useKeyboardHeight`'s doc comment).
  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView behavior="padding" className="flex-1 bg-canvas dark:bg-canvas-dark">
        <SafeAreaView edges={edges} className="flex-1">
          {content}
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      style={{ paddingBottom: keyboardHeight }}
    >
      <SafeAreaView edges={edges} className="flex-1">
        {content}
      </SafeAreaView>
    </View>
  );
}
