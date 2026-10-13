import { createContext, useContext } from 'react';

/**
 * How much extra bottom padding a screen's scrollable content needs to
 * clear an overlaying floating tab bar — 0 for any screen not nested under
 * one (the default). Set by the app's own tab-bar component, read by
 * `Screen` so individual screens don't each need to know about it.
 */
export const FloatingTabBarInsetContext = createContext(0);

export function useFloatingTabBarInset(): number {
  return useContext(FloatingTabBarInsetContext);
}
