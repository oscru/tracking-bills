import { FloatingTabBarInsetContext, useIsDesktop } from '@repo/ui';
import { Tabs, useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useFloatingTabBarHeight } from '../../../features/navigation/floating-tab-bar';

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

export default function AppLayout() {
  const floatingInset = useFloatingTabBarHeight();
  // Desktop web has a sidebar, not a bar floating over the content.
  const desktop = useIsDesktop();
  usePreloadTabs();
  const { t } = useTranslation('navigation');

  return (
    <FloatingTabBarInsetContext.Provider value={desktop ? 0 : floatingInset}>
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
        // The floating bar is drawn by the app's root layout (`AppTabBar`),
        // above every screen — not here, inside the tabs, where anything
        // opened over them covered it.
        tabBar={() => null}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.index'),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: t('tabs.transactions'),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: t('tabs.analytics'),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabs.settings'),
          }}
        />
      </Tabs>
    </FloatingTabBarInsetContext.Provider>
  );
}
