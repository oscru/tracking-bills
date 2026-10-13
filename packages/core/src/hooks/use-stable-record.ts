import { useRef } from 'react';

/**
 * Keeps returning the last non-null value once `value` itself goes missing.
 * A detail screen's `list.find((x) => x.id === id)` lookup can transiently
 * return `undefined` the instant Expo Router clears the route's `id` param
 * while the screen is mid pop-transition (navigating back) — without this,
 * the screen falls into its "not found" branch and flashes that near-blank
 * state right as it slides away, instead of just sliding its real content
 * out like it looks like it's doing.
 */
export function useStableRecord<T>(value: T | null | undefined): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  if (value != null) ref.current = value;
  return value ?? ref.current;
}
