import { useProfile } from '@repo/core/hooks';
import { ICON_COLORS } from '@repo/ui';
import { colorScheme, useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';

/**
 * Applies the profile's theme preference to NativeWind's imperative color
 * scheme as soon as it loads or changes — mounted once above the app's
 * screens. `colorScheme.set` is a real side effect (it updates a NativeWind
 * context outside this component), so it has to run in a `useEffect`, not
 * during render — calling it during render updates another component while
 * this one is still rendering, which React rejects.
 *
 * Also keeps Android's native root window background in sync with the
 * resolved scheme. That native background (not anything React renders) is
 * what briefly flashes white during a screen transition — it sits a layer
 * below React Navigation's own `contentStyle`, which only affects each
 * screen's JS-rendered content, not the native window underneath it.
 */
export function ThemeSync() {
  const { data: profile } = useProfile();
  const preference = profile?.theme_preference;
  const { colorScheme: resolved } = useColorScheme();

  useEffect(() => {
    if (preference) colorScheme.set(preference);
  }, [preference]);

  // Web: NativeWind's dark mode is class-based (`darkMode: 'class'` in the
  // preset), so the `dark:` styles only apply with a `dark` class on <html>
  // — which nothing set. With the OS in dark mode the CSS stayed light while
  // every color picked in JS (chart fills, icons…) went dark: a dark donut
  // on a white card, dark text on a dark circle. Keep the class (and the
  // browser's own color-scheme) in step with the resolved scheme.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const dark = resolved === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, [resolved]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const dark = resolved === 'dark';
    SystemUI.setBackgroundColorAsync(dark ? ICON_COLORS.canvasDark : ICON_COLORS.canvas).catch(
      () => {},
    );
  }, [resolved]);

  return null;
}
