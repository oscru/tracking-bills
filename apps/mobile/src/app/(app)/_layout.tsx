import { Stack } from 'expo-router';

import { ThemeSync } from '../../features/settings/theme-sync';
import { WelcomeTour } from '../../features/tour/welcome-tour';

export default function AppRootLayout() {
  return (
    <>
      <ThemeSync />
      <WelcomeTour />
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
