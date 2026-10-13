import '../global.css';
import '../web-setup';

import { createQueryClient, SessionProvider, useSession } from '@repo/core/hooks';
import { SheetPortalHost, ICON_COLORS } from '@repo/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableFreeze } from 'react-native-screens';
import * as WebBrowser from 'expo-web-browser';

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

function AuthGate() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-canvas-dark">
        <ActivityIndicator />
      </View>
    );
  }

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
            </NavigationTheme>
          </SafeAreaProvider>
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
