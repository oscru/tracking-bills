import '../global.css';

import { createQueryClient, SessionProvider, useSession } from '@repo/core/hooks';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// TODO(auth): DEV-ONLY. Remove this import and every `|| bypass` below, then
// delete src/features/auth/dev-auth-bypass.ts. Auth must always be enforced.
import { hydrateDevAuthBypass, useDevAuthBypass } from '../features/auth/dev-auth-bypass';

const queryClient = createQueryClient();

function AuthGate() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  // TODO(auth): DEV-ONLY bypass — remove.
  const [bypass] = useDevAuthBypass();
  const [bypassHydrated, setBypassHydrated] = useState(false);
  useEffect(() => {
    hydrateDevAuthBypass().finally(() => setBypassHydrated(true));
  }, []);

  const booting = loading || !bypassHydrated;
  const authed = Boolean(session) || bypass; // TODO(auth): drop `|| bypass`

  useEffect(() => {
    if (booting) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!authed && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (authed && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [authed, booting, segments, router]);

  if (booting) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <AuthGate />
        </SafeAreaProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
