import { completeOAuthSignIn, startOAuthSignIn, type OAuthProvider } from '@repo/core/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

/**
 * Drives the browser round-trip for Google/Apple sign-in: opens the
 * provider's consent screen and resolves once it redirects back to the
 * app. This lives here (not `@repo/core`) because opening a browser is
 * platform UI, not a Supabase call — `startOAuthSignIn` and
 * `completeOAuthSignIn`, the actual auth logic, are core functions.
 */
export function useOAuthSignIn() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      const redirectTo = Linking.createURL('/');
      const authUrl = await startOAuthSignIn(provider, redirectTo);
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
      if (result.type !== 'success') {
        throw new Error('Inicio de sesión cancelado');
      }
      return completeOAuthSignIn(result.url);
    },
    onSuccess: () => qc.clear(),
  });
}
