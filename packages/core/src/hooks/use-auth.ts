import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signInWithPassword, signOut, signUpWithPassword } from '../supabase';

/** Drop every cached query so data isn't shared across auth states. */
function useAuthCacheReset() {
  const qc = useQueryClient();
  return () => qc.clear();
}

export function useSignIn() {
  const reset = useAuthCacheReset();
  return useMutation({ mutationFn: signInWithPassword, onSuccess: reset });
}

export function useSignUp() {
  const reset = useAuthCacheReset();
  return useMutation({ mutationFn: signUpWithPassword, onSuccess: reset });
}

export function useSignOut() {
  const reset = useAuthCacheReset();
  return useMutation({ mutationFn: signOut, onSuccess: reset });
}
