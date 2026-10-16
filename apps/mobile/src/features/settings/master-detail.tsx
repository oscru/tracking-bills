import { EmptyState, PageHeaderBackContext, Screen, useIsDesktop } from '@repo/ui';
import { Stack } from 'expo-router';
import { createContext, useContext, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTabBarAction, type TabBarAction } from '../navigation/floating-tab-bar';

const InListPaneContext = createContext(false);

/**
 * True for a list drawn in the left pane of `MasterDetailLayout` (desktop):
 * the open detail beside it owns the sidebar's primary action, so the list
 * must not register its own ("Nueva cuenta") over it.
 */
export function useInListPane(): boolean {
  return useContext(InListPaneContext);
}

/**
 * Layout for a settings section with a list and its records (cuentas,
 * categorías, tags). On phones, the usual stack: list, then the record
 * pushed over it. On desktop web, the list stays on the left (~1/3) and the
 * section's routes — detail, edit, new, or an empty pane — open on the
 * right (~2/3), using the wide screen instead of one narrow column.
 */
export function MasterDetailLayout({ list }: { list: ReactNode }) {
  const desktop = useIsDesktop();
  const stack = (
    <Stack
      screenOptions={{ headerShown: false, animation: desktop ? 'none' : 'slide_from_right' }}
    />
  );
  if (!desktop) return stack;
  // Same overall width as the other desktop screens (`Screen`'s `wide`),
  // centered — not stretched edge to edge on a big monitor. The pane's
  // screens have no back arrow: the list beside them is how you move.
  return (
    <View
      className="flex-1 flex-row"
      style={{ width: '100%', maxWidth: 1240, alignSelf: 'center' }}
    >
      <View
        style={{ flex: 1, maxWidth: 440 }}
        className="border-r border-line dark:border-line-dark"
      >
        <InListPaneContext.Provider value>{list}</InListPaneContext.Provider>
      </View>
      <View style={{ flex: 2 }}>
        <PageHeaderBackContext.Provider value={false}>{stack}</PageHeaderBackContext.Provider>
      </View>
    </View>
  );
}

/**
 * The right pane before anything is picked (desktop): the section's own
 * empty-state illustration, centered in the pane. Registers the section's
 * primary action ("Nueva cuenta") — the list beside it doesn't.
 */
export function MasterDetailEmpty({
  illustration,
  title,
  description,
  action,
}: {
  /** The section's `*EmptyIllustration` (the same one its empty list shows). */
  illustration: ReactNode;
  title: string;
  description: string;
  /** The sidebar's primary action meanwhile; omitted = the app's default. */
  action?: TabBarAction;
}) {
  useTabBarAction(action ?? null);
  return (
    <Screen width="wide">
      <EmptyState illustration={illustration} title={title} description={description} />
    </Screen>
  );
}
