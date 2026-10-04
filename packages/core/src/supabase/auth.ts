import type { AuthError, Session } from '@supabase/supabase-js';

import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from '../validators';
import { supabase } from './client';
import { SupabaseError } from './internal';

/** Thrown when a Supabase Auth call fails. */
export class AuthCallError extends Error {
  readonly status: number | undefined;
  readonly code: string | undefined;

  constructor(cause: AuthError) {
    super(cause.message);
    this.name = 'AuthCallError';
    this.status = cause.status;
    this.code = cause.code;
  }
}

export async function signInWithPassword(input: SignInInput): Promise<Session> {
  const { email, password } = signInSchema.parse(input);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new AuthCallError(error);
  return data.session;
}

export interface SignUpResult {
  /** Present when email confirmation is disabled (the user is signed in now). */
  session: Session | null;
  /** True when the user must confirm their email before signing in. */
  needsEmailConfirmation: boolean;
}

export async function signUpWithPassword(input: SignUpInput): Promise<SignUpResult> {
  const { email, password, fullName, birthDate, gender } = signUpSchema.parse(input);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the `handle_new_user` trigger into the new profile row — the
    // only way to get these fields there even when email confirmation
    // delays having an authenticated session to update the row directly.
    options: { data: { full_name: fullName, birth_date: birthDate, gender } },
  });
  if (error) throw new AuthCallError(error);
  return {
    session: data.session,
    needsEmailConfirmation: data.session === null,
  };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AuthCallError(error);
}

export type OAuthProvider = 'google' | 'apple';

/**
 * Starts an OAuth sign-in and returns the provider's authorize URL — the
 * caller opens it in a browser (native: `expo-web-browser`; web: a page
 * redirect) and hands the resulting callback URL to `completeOAuthSignIn`.
 * `skipBrowserRedirect` keeps Supabase from navigating anywhere itself,
 * since only the app (which owns the browser/redirect UI) can do that.
 */
export async function startOAuthSignIn(
  provider: OAuthProvider,
  redirectTo: string,
): Promise<string> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw new AuthCallError(error);
  return data.url;
}

/**
 * Finishes an OAuth sign-in from the callback URL the browser redirected
 * to. Supabase's default PKCE flow puts an authorization `code` in that
 * URL's query string; `exchangeCodeForSession` swaps it for a session using
 * the verifier it stored when `startOAuthSignIn` ran.
 */
export async function completeOAuthSignIn(callbackUrl: string): Promise<Session> {
  const { searchParams } = new URL(callbackUrl);
  const errorDescription = searchParams.get('error_description');
  if (errorDescription) throw new Error(errorDescription);

  const code = searchParams.get('code');
  if (!code) throw new Error('No se recibió un código de autenticación.');

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw new AuthCallError(error);
  return data.session;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw new AuthCallError(error);
}

/**
 * Deletes the caller's own account and every row of theirs in every table —
 * irreversible. The mobile client can't hold the service-role key the Admin
 * API's `deleteUser` needs, so this calls a `security definer` RPC instead
 * (see migration `20261004120000_delete_own_account.sql`): it deletes only
 * `auth.uid()`'s own `auth.users` row, server-side, which cascades through
 * `profiles` into everything else already set up with `on delete cascade`.
 * Doesn't sign out locally — the caller should do that right after this
 * resolves (the session token itself still works for the rest of its
 * lifetime otherwise, pointing at a user that no longer exists).
 */
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw new SupabaseError(error);
}
