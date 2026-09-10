import type { PostgrestError } from '@supabase/supabase-js';

/** Thrown when a Supabase/PostgREST call returns an error. */
export class SupabaseError extends Error {
  readonly code: string;
  readonly details: string | null;
  readonly hint: string | null;

  constructor(cause: PostgrestError) {
    super(cause.message);
    this.name = 'SupabaseError';
    this.code = cause.code;
    this.details = cause.details;
    this.hint = cause.hint;
  }
}

/** Return `data` or throw a `SupabaseError` if the response carries one. */
export function unwrap<T>(res: { data: T | null; error: PostgrestError | null }): T {
  if (res.error) throw new SupabaseError(res.error);
  if (res.data === null) {
    throw new Error('Supabase returned neither data nor an error');
  }
  return res.data;
}
