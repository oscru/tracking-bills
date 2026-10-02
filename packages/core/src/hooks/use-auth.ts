import { useMutation, useQueryClient } from '@tanstack/react-query';

import { completeOAuthSignIn, signInWithPassword, signOut, signUpWithPassword } from '../supabase';

/** Drop every cached query so data isn't shared across auth states. */
function useAuthCacheReset() {
  const qc = useQueryClient();
  return () => qc.clear();
}

export function useSignIn() {
  const reset = useAuthCacheReset();
  return useMutation({ mutationFn: signInWithPassword, onSuccess: reset });
}

/**
 * Finishes an OAuth sign-in given the browser's callback URL — the
 * browser/redirect step itself is platform UI and lives in the app, which
 * calls `startOAuthSignIn` directly and hands the result here.
 */
export function useOAuthCallback() {
  const reset = useAuthCacheReset();
  return useMutation({ mutationFn: completeOAuthSignIn, onSuccess: reset });
}

export function useSignUp() {
  const reset = useAuthCacheReset();
  return useMutation({ mutationFn: signUpWithPassword, onSuccess: reset });
}

export function useSignOut() {
  const reset = useAuthCacheReset();
  return useMutation({ mutationFn: signOut, onSuccess: reset });
}
