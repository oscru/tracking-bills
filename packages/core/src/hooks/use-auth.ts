import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  completeOAuthSignIn,
  deleteOwnAccount,
  resetPasswordWithCode,
  sendPasswordReset,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from '../supabase';

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

/** Emails a password-reset code. */
export function useSendPasswordReset() {
  return useMutation({ mutationFn: sendPasswordReset });
}

/** Verifies the emailed code and sets the new password — signs the user in. */
export function useResetPasswordWithCode() {
  const reset = useAuthCacheReset();
  return useMutation({ mutationFn: resetPasswordWithCode, onSuccess: reset });
}

export function useSignUp() {
  const reset = useAuthCacheReset();
  return useMutation({ mutationFn: signUpWithPassword, onSuccess: reset });
}

export function useSignOut() {
  const reset = useAuthCacheReset();
  return useMutation({ mutationFn: signOut, onSuccess: reset });
}

/** Deletes the account server-side, then signs out locally — see
 * `deleteOwnAccount`'s doc comment for why both steps are needed. */
export function useDeleteOwnAccount() {
  const reset = useAuthCacheReset();
  return useMutation({
    mutationFn: async () => {
      await deleteOwnAccount();
      await signOut();
    },
    onSuccess: reset,
  });
}
