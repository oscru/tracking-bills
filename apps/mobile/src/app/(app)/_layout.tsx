import { Stack } from 'expo-router';

export default function AppRootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="new-transaction" />
      <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
      <Stack.Screen name="monthly-spending" />
      <Stack.Screen name="category-month-spending" />
    </Stack>
  );
}
