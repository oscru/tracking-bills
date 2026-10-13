import { FloatingTabBarInsetContext } from '@repo/ui';
import { Tabs, useRouter, type Href } from 'expo-router';
import { ArrowLeftRight, ChartNoAxesColumn, FileText, House, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { type ColorValue } from 'react-native';

import {
  FloatingTabBar,
  TabBarActionProvider,
  useFloatingTabBarHeight,
} from '../../../features/navigation/floating-tab-bar';

// Tabs other than Inicio, mounted in the background one at a time after
// launch — so the first tap on each one shows an already-rendered screen
// instead of building it (charts, lists, queries) right as you switch.
const PRELOADED_TABS: Href[] = ['/(app)/transactions', '/(app)/analytics', '/(app)/settings'];
const PRELOAD_START_MS = 600;
const PRELOAD_STEP_MS = 250;

function usePreloadTabs() {
  const router = useRouter();
  useEffect(() => {
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      const href = PRELOADED_TABS[i++];
      if (!href) return;
      router.prefetch(href);
      timer = setTimeout(next, PRELOAD_STEP_MS);
    };
    timer = setTimeout(next, PRELOAD_START_MS);
    return () => clearTimeout(timer);
  }, [router]);
}

function TabIcon({
  icon: Icon,
  color,
  focused,
}: {
  icon: LucideIcon;
  color: ColorValue;
  focused: boolean;
}) {
  // Lucide icons are a single stroke style (no separate outline/filled
  // glyphs like Ionicons) — the lime capsule behind the active tab already
  // carries the selected state, so a bolder stroke is just a light extra
  // touch rather than the primary signal.
  return <Icon color={color} size={22} strokeWidth={focused ? 2.25 : 1.75} />;
}

export default function AppLayout() {
  const floatingInset = useFloatingTabBarHeight();
  usePreloadTabs();

  return (
    <FloatingTabBarInsetContext.Provider value={floatingInset}>
      <TabBarActionProvider>
        <Tabs
          screenOptions={{
            headerShown: false,
            // No transition between tabs (testing): the switch is instant.
            animation: 'none',
            // Tabs with a nested Stack (settings, transactions) would
            // otherwise keep whatever screen was last pushed. Popping on blur
            // (after the switch animation) means coming back always lands on
            // the tab's root, without a visible pop when you return.
            popToTopOnBlur: true,
          }}
          tabBar={(props) => <FloatingTabBar {...props} />}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Inicio',
              tabBarIcon: ({ color, focused }) => <TabIcon icon={House} color={color} focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="transactions"
            options={{
              title: 'Movimientos',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon icon={ArrowLeftRight} color={color} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="analytics"
            options={{
              title: 'Análisis',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon icon={ChartNoAxesColumn} color={color} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Opciones',
              tabBarIcon: ({ color, focused }) => (
                <TabIcon icon={FileText} color={color} focused={focused} />
              ),
            }}
          />
        </Tabs>
      </TabBarActionProvider>
    </FloatingTabBarInsetContext.Provider>
  );
}
