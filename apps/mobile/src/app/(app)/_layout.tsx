import { useIsDesktop } from '@repo/ui';
import { Stack } from 'expo-router';
import { ArrowLeftRight, ChartNoAxesColumn, House, Settings2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  AppTabBar,
  TabBarActionProvider,
  type AppTab,
} from '../../features/navigation/floating-tab-bar';

import { DesktopSidebar } from '../../features/navigation/desktop-sidebar';
import { NotificationSync } from '../../features/notifications/notification-sync';
import { LedgerSync } from '../../features/sync/ledger-sync';
import { LegalGate } from '../../features/legal/legal-gate';
import { ThemeSync } from '../../features/settings/theme-sync';
import { WelcomeTour } from '../../features/tour/welcome-tour';

// Titles come from `navigation:tabs.<name>`.
const TABS = [
  { name: 'index', icon: House, href: '/(app)' },
  { name: 'transactions', icon: ArrowLeftRight, href: '/(app)/transactions' },
  { name: 'analytics', icon: ChartNoAxesColumn, href: '/(app)/analytics' },
  { name: 'settings', icon: Settings2, href: '/(app)/settings' },
] as const satisfies Omit<AppTab, 'title'>[];

export default function AppRootLayout() {
  // Desktop web: a sidebar beside the screens instead of the floating bar.
  const desktop = useIsDesktop();
  const { t } = useTranslation('navigation');
  const tabs: AppTab[] = useMemo(
    () => TABS.map((tab) => ({ ...tab, title: t(`tabs.${tab.name}`) })),
    [t],
  );
  const stack = (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      {/* A regular screen sliding up, not a native modal: a modal is its own
      native window on iOS and would cover the navbar drawn below. */}
      <Stack.Screen
        name="new-transaction"
        options={{ animation: 'slide_from_bottom', gestureDirection: 'vertical' }}
      />
      <Stack.Screen name="profile" options={{ presentation: desktop ? 'card' : 'modal' }} />
      <Stack.Screen name="monthly-spending" />
      <Stack.Screen name="category-month-spending" />
    </Stack>
  );

  return (
    // The provider spans both the screens (which register the navbar's action)
    // and the bar itself, which is drawn after the stack — on top of it.
    <TabBarActionProvider>
      <ThemeSync />
      <NotificationSync />
      <LedgerSync />
      <WelcomeTour />
      {desktop ? (
        <View className="flex-1 flex-row bg-canvas dark:bg-canvas-dark">
          <DesktopSidebar tabs={tabs} />
          <View className="flex-1">{stack}</View>
        </View>
      ) : (
        <>
          {stack}
          <AppTabBar tabs={tabs} />
        </>
      )}
      {/* Last, over everything (navbar included): accepting the current
      legal documents comes before using the app. */}
      <LegalGate />
    </TabBarActionProvider>
  );
}
