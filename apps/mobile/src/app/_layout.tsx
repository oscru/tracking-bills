import '../global.css';
import '../web-setup';

import {
  createQueryClient,
  SessionProvider,
  useAccountBalanceEffects,
  useAccounts,
  useMonthlyCategoryTotals,
  useProfile,
  useSession,
} from '@repo/core/hooks';
import { SheetPortalHost, ICON_COLORS } from '@repo/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableFreeze } from 'react-native-screens';
import * as WebBrowser from 'expo-web-browser';

import { AppLock } from '../features/security/app-lock';
import { AppSplash } from '../features/splash/app-splash';
import { FloatingDraftBubble } from '../features/transactions/floating-draft-bubble';

const queryClient = createQueryClient();

// Screens that aren't visible (inactive tabs, screens under a pushed one)
// stop re-rendering until they're shown again. Without this every query
// update (a refetch, a mutation's invalidation) re-renders every tab and
// every stacked screen at once, which is what made tab switches stutter.
enableFreeze(true);

/**
 * React Navigation paints its own scene/card backgrounds from this theme —
 * left at the library default (light gray, never dark), every transition
 * and every not-yet-rendered screen flashed that color instead of the app's
 * canvas.
 */
function NavigationTheme({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const theme = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: ICON_COLORS.lime,
        background: dark ? ICON_COLORS.canvasDark : ICON_COLORS.canvas,
        card: dark ? ICON_COLORS.surfaceDark : ICON_COLORS.surface,
        text: dark ? ICON_COLORS.inkDark : ICON_COLORS.ink,
        border: dark ? ICON_COLORS.lineDark : ICON_COLORS.line,
      },
    };
  }, [dark]);
  return <ThemeProvider value={theme}>{children}</ThemeProvider>;
}

// On web, Google/Apple sign-in opens a popup that redirects back to this
// same app; this call (a no-op on native) posts that popup's callback URL
// to the opener and closes it. Runs unconditionally at load time because
// the popup reloads the whole app fresh at the redirect URL.
WebBrowser.maybeCompleteAuthSession();

/**
 * Redirects in/out of the auth group. Kept in its own leaf component that
 * renders nothing: `useSegments` re-renders its caller on every single
 * navigation, and when that caller was `AuthGate` it re-rendered the root
 * `Stack` (and the draft bubble) on every tab press.
 */
function AuthRedirect() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [session, loading, segments, router]);

  return null;
}

/**
 * Loads what Inicio needs to paint while the splash is still up, so the app
 * opens ready instead of on a skeleton. Rendered only with a session
 * (fetching before sign-in would cache empty, unauthorized results). The
 * queries stay cached after this unmounts — Inicio's own hooks pick them up
 * instantly.
 *
 * All of it is small now: the balance and month totals come pre-summed from
 * Postgres (supabase/summaries.ts) instead of the whole transaction history,
 * so the splash can simply wait for everything (`AppSplash` still caps it).
 */
function WarmUpHome({ onReady }: { onReady: () => void }) {
  const accounts = useAccounts();
  const profile = useProfile();
  const balances = useAccountBalanceEffects();
  const summary = useMonthlyCategoryTotals();
  const settled = [accounts, profile, balances, summary].every((q) => !q.isLoading);
  useEffect(() => {
    if (settled) onReady();
  }, [settled, onReady]);
  return null;
}

/** The launch screen: until the session is read and, when signed in, Inicio's data has loaded. */
function LaunchSplash() {
  const { session, loading } = useSession();
  const [homeReady, setHomeReady] = useState(false);
  const markHomeReady = useCallback(() => setHomeReady(true), []);
  return (
    <>
      {session && !homeReady ? <WarmUpHome onReady={markHomeReady} /> : null}
      <AppSplash ready={!loading && (!session || homeReady)} />
    </>
  );
}

function AuthGate() {
  const { session, loading } = useSession();

  // The branded splash (`AppSplash`) covers this while the session loads.
  if (loading) return <View className="flex-1 bg-canvas-dark" />;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      <AuthRedirect />
      {session ? <FloatingDraftBubble /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <SafeAreaProvider>
            <StatusBar style="auto" />
            <NavigationTheme>
              <SheetPortalHost>
                <AuthGate />
              </SheetPortalHost>
              {/* After the sheet portal, so a locked app covers open sheets too. */}
              <AppLock />
              {/* Last, so it covers everything — including the lock screen. */}
              <LaunchSplash />
            </NavigationTheme>
          </SafeAreaProvider>
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
