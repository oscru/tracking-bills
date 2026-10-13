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

/** Breathing room kept between the last item of a scroll and the top of the floating tab bar. */
const SCROLL_END_GAP = 24;

/**
 * `paddingBottom` for a scroll view's content inside the tabs: enough to
 * scroll its last item fully clear of the floating tab bar (which overlays
 * the content instead of taking layout space), plus a small gap. Outside the
 * tabs there's no bar, so it's just the gap.
 */
export function useTabBarScrollPadding(extra: number = SCROLL_END_GAP): number {
  return useFloatingTabBarInset() + extra;
}
