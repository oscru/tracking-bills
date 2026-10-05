import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge, type Edges } from 'react-native-safe-area-context';

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
}

export function Screen({
  children,
  className = '',
  edges = ['top', 'bottom'],
  center = false,
  scroll = false,
}: ScreenProps) {
  // Android only (0 on iOS) — see `useKeyboardHeight`'s doc comment for why
  // `KeyboardAvoidingView`'s own behaviors aren't used there.
  const keyboardHeight = useKeyboardHeight();

  // On wide web the content column is capped and centered.
  const web = Platform.OS === 'web' ? 'mx-auto w-full max-w-[480px]' : '';

  // Decorative breathing room, separate from `SafeAreaView`'s `edges`
  // (system chrome only). A screen that drops `'bottom'` already has
  // something else owning that edge — the tab bar below it, or its own
  // sticky footer — so it only needs a sliver here, not the full default.
  const vertical = `pt-3 ${includesBottomEdge(edges) ? 'pb-4' : 'pb-1'}`;

  const content = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={`grow px-5 ${vertical} ${web} ${center ? 'justify-center' : ''} ${className}`}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      className={`flex-1 px-5 ${vertical} ${web} ${center ? 'justify-center' : ''} ${className}`}
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
    <View className="flex-1 bg-canvas dark:bg-canvas-dark" style={{ paddingBottom: keyboardHeight }}>
      <SafeAreaView edges={edges} className="flex-1">
        {content}
      </SafeAreaView>
    </View>
  );
}
