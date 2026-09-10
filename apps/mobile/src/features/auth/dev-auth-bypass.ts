import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * ============================================================================
 * TODO(auth): DEV-ONLY. Remove this whole module before shipping.
 * It lets you enter the app without a Supabase session (toggle on the sign-in
 * screen). Auth must always be enforced in production — delete the toggle, this
 * file, and the `|| bypass` checks in `app/_layout.tsx`, then leave the
 * AuthGate requiring a real session, always.
 *
 * Note: with no session, RLS only exposes the shared default categories —
 * accounts and transactions will look empty.
 * ============================================================================
 */

const STORAGE_KEY = 'dev.auth.bypass';

let enabled = false;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

/** Read the persisted value once at startup. */
export async function hydrateDevAuthBypass(): Promise<void> {
  try {
    enabled = (await AsyncStorage.getItem(STORAGE_KEY)) === '1';
  } catch {
    enabled = false;
  }
  hydrated = true;
  emit();
}

export function isDevAuthBypassHydrated(): boolean {
  return hydrated;
}

export function setDevAuthBypass(next: boolean): void {
  enabled = next;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0').catch(() => {});
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => enabled;

/** `[enabled, setEnabled]` — reactive access to the dev bypass flag. */
export function useDevAuthBypass(): readonly [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [value, setDevAuthBypass] as const;
}
