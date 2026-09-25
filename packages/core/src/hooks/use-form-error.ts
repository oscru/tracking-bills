import { useCallback, useState } from 'react';

import { toFriendlyMessage } from '../utils/errors';

/**
 * Local form-error state that translates thrown errors (Supabase/Auth/
 * network) into user-facing Spanish text via `toFriendlyMessage`, instead of
 * every form re-implementing `e instanceof Error ? e.message : fallback`
 * (which leaks raw driver messages like unique-constraint violations).
 */
export function useFormError() {
  const [error, setErrorState] = useState<string | null>(null);

  /** Set from a caught error, translated to friendly text (falls back to `fallback`). */
  const setError = useCallback((err: unknown, fallback: string) => {
    setErrorState(toFriendlyMessage(err, fallback));
  }, []);

  const clearError = useCallback(() => setErrorState(null), []);

  return { error, setError, clearError } as const;
}
