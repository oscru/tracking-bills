import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signInWithPassword, signOut, signUpWithPassword } from '../supabase';

export function useSignIn() {
  return useMutation({ mutationFn: signInWithPassword });
}

export function useSignUp() {
  return useMutation({ mutationFn: signUpWithPassword });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      // Drop every cached query so the next user starts clean.
      qc.clear();
    },
  });
}
