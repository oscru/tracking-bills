import { Stack } from 'expo-router';

import { ThemeSync } from '../../features/settings/theme-sync';

export default function AppRootLayout() {
  return (
    <>
      <ThemeSync />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new-transaction" />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="monthly-spending" />
        <Stack.Screen name="category-month-spending" />
      </Stack>
    </>
  );
}
