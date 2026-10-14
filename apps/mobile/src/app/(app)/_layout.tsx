import { Stack } from 'expo-router';
import { ArrowLeftRight, ChartNoAxesColumn, House, Settings2 } from 'lucide-react-native';

import {
  AppTabBar,
  TabBarActionProvider,
  type AppTab,
} from '../../features/navigation/floating-tab-bar';

import { NotificationSync } from '../../features/notifications/notification-sync';
import { ThemeSync } from '../../features/settings/theme-sync';
import { WelcomeTour } from '../../features/tour/welcome-tour';

const TABS: AppTab[] = [
  { name: 'index', title: 'Inicio', icon: House, href: '/(app)' },
  { name: 'transactions', title: 'Movimientos', icon: ArrowLeftRight, href: '/(app)/transactions' },
  { name: 'analytics', title: 'Análisis', icon: ChartNoAxesColumn, href: '/(app)/analytics' },
  { name: 'settings', title: 'Opciones', icon: Settings2, href: '/(app)/settings' },
];

export default function AppRootLayout() {
  return (
    // The provider spans both the screens (which register the navbar's action)
    // and the bar itself, which is drawn after the stack — on top of it.
    <TabBarActionProvider>
      <ThemeSync />
      <NotificationSync />
      <WelcomeTour />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        {/* A regular screen sliding up, not a native modal: a modal is its own
        native window on iOS and would cover the navbar drawn below. */}
        <Stack.Screen
          name="new-transaction"
          options={{ animation: 'slide_from_bottom', gestureDirection: 'vertical' }}
        />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="monthly-spending" />
        <Stack.Screen name="category-month-spending" />
      </Stack>
      <AppTabBar tabs={TABS} />
    </TabBarActionProvider>
  );
}
