import { Stack } from 'expo-router';

// Tab navigation arrives with the dashboard (Phase 7).
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
