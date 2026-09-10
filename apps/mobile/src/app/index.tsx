import { Redirect } from 'expo-router';

// The AuthGate in _layout redirects to /(auth)/sign-in when there's no session.
export default function Index() {
  return <Redirect href="/(app)" />;
}
