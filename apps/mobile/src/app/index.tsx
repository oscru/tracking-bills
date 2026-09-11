import { useSession } from '@repo/core/hooks';
import { Redirect } from 'expo-router';

// Route straight to the right group so the (app) screens never mount (and never
// fire their queries) before there's a session.
export default function Index() {
  const { session, loading } = useSession();
  if (loading) return null;
  return <Redirect href={session ? '/(app)' : '/(auth)/sign-in'} />;
}
