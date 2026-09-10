import type { AuthError, Session } from '@supabase/supabase-js';

import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from '../validators';
import { supabase } from './client';

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
  const { email, password } = signUpSchema.parse(input);
  const { data, error } = await supabase.auth.signUp({ email, password });
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

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw new AuthCallError(error);
}
