import '../global.css';
import '../web-setup';

import { createQueryClient, SessionProvider, useSession } from '@repo/core/hooks';
import { SheetPortalHost } from '@repo/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FloatingDraftBubble } from '../features/transactions/floating-draft-bubble';

const queryClient = createQueryClient();

function AuthGate() {
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {session ? <FloatingDraftBubble /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <SheetPortalHost>
            <AuthGate />
          </SheetPortalHost>
        </SafeAreaProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
