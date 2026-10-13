import { Stack } from 'expo-router';

import { ThemeSync } from '../../features/settings/theme-sync';
import { WelcomeTour } from '../../features/tour/welcome-tour';

export default function AppRootLayout() {
  return (
    <>
      <ThemeSync />
      <WelcomeTour />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen
          name="new-transaction"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="monthly-spending" />
        <Stack.Screen name="category-month-spending" />
      </Stack>
    </>
  );
}
