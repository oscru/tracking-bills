import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile, useSession } from '@repo/core/hooks';
import type { ThemePreference } from '@repo/core/types';
import { ICON_COLORS } from '@repo/ui';
import { colorScheme, useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { withThemeTransition, type TransitionOrigin } from './theme-transition';

const SIGNED_OUT_THEME_KEY = 'genobills.signed-out-theme';

function setWebDarkClass(dark: boolean) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

/**
 * `colorScheme.set` plus a fix for web: there, NativeWind's `set('system')`
 * always removes the `dark` class from <html>, even with the OS in dark
 * mode. The resolved scheme doesn't change, so `ColorSchemeEffects` never
 * re-adds it, and the CSS stayed light while JS-picked colors went dark.
 */
function applyColorScheme(preference: ThemePreference) {
  colorScheme.set(preference);
  setWebDarkClass(resolve(preference) === 'dark');
}

/**
 * Theme choice made while signed out (the toggle on the auth screens). The
 * signed-in app follows the profile's `theme_preference` instead (see
 * `ThemeSync`); this only covers the screens before there's a profile.
 */
function resolve(preference: ThemePreference) {
  return preference === 'system' ? (Appearance.getColorScheme() ?? 'light') : preference;
}

/**
 * Switches the theme right away, with the reveal transition on web
 * (`withThemeTransition`) when what's on screen actually changes — picking
 * "Sistema" while the system already matches just applies it.
 */
export function switchColorScheme(preference: ThemePreference, origin?: TransitionOrigin) {
  const current = colorScheme.get() ?? Appearance.getColorScheme() ?? 'light';
  if (resolve(preference) === current) {
    applyColorScheme(preference);
    return;
  }
  withThemeTransition(() => applyColorScheme(preference), origin);
}

export function setSignedOutTheme(scheme: 'light' | 'dark', origin?: TransitionOrigin) {
  switchColorScheme(scheme, origin);
  AsyncStorage.setItem(SIGNED_OUT_THEME_KEY, scheme).catch(() => {});
}

/**
 * Applies the profile's theme preference to NativeWind's imperative color
 * scheme as soon as it loads or changes — mounted once above the signed-in
 * app's screens. `colorScheme.set` is a real side effect (it updates a
 * NativeWind context outside this component), so it has to run in a
 * `useEffect`, not during render — calling it during render updates another
 * component while this one is still rendering, which React rejects.
 */
export function ThemeSync() {
  const { data: profile } = useProfile();
  const preference = profile?.theme_preference;

  useEffect(() => {
    if (preference) applyColorScheme(preference as ThemePreference);
  }, [preference]);

  return null;
}

/**
 * Mounted once at the root, signed in or not, so the auth screens get these
 * too:
 * - signed out: applies the theme saved by the auth screens' toggle
 *   (`setSignedOutTheme`), or the system one if there's none;
 * - web: keeps the `dark` class on <html> in step with the resolved scheme;
 * - Android: keeps the native root window background in step with it.
 *
 * Android's native background (not anything React renders) is what briefly
 * flashes white during a screen transition — it sits a layer below React
 * Navigation's own `contentStyle`, which only affects each screen's
 * JS-rendered content, not the native window underneath it.
 */
export function ColorSchemeEffects() {
  const { session, loading } = useSession();
  const { colorScheme: resolved } = useColorScheme();
  const signedOut = !loading && !session;

  useEffect(() => {
    if (!signedOut) return;
    let cancelled = false;
    AsyncStorage.getItem(SIGNED_OUT_THEME_KEY)
      .catch(() => null)
      .then((saved) => {
        if (cancelled) return;
        applyColorScheme(saved === 'light' || saved === 'dark' ? saved : 'system');
      });
    return () => {
      cancelled = true;
    };
  }, [signedOut]);

  // Web: NativeWind's dark mode is class-based (`darkMode: 'class'` in the
  // preset), so the `dark:` styles only apply with a `dark` class on <html>
  // — which nothing set. With the OS in dark mode the CSS stayed light while
  // every color picked in JS (chart fills, icons…) went dark: a dark donut
  // on a white card, dark text on a dark circle. Keep the class (and the
  // browser's own color-scheme) in step with the resolved scheme.
  useEffect(() => {
    setWebDarkClass(resolved === 'dark');
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
