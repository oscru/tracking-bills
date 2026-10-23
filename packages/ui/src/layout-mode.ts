import { Platform, useWindowDimensions } from 'react-native';

/**
 * Web at least this wide gets the desktop layout: a sidebar instead of the
 * floating tab bar, wider content, dialogs instead of bottom sheets. Tablets
 * included — below it (phones, narrow browser windows) the web app looks
 * exactly like the mobile one. Native is never "desktop".
 */
export const DESKTOP_MIN_WIDTH = 768;

/**
 * Desktop at least this wide is "wide": room for things beside the content —
 * a detail pane next to its list, two-column screens, the expanded sidebar by
 * default. Between `DESKTOP_MIN_WIDTH` and this (tablets, small windows) the
 * desktop layout is compact: rail sidebar, one column, details as screens.
 */
export const WIDE_DESKTOP_MIN_WIDTH = 1200;

/** Content widths on desktop: `wide` for dashboards and lists, `narrow` for details and settings, `compact` for focused forms (the calculator). */
export const DESKTOP_CONTENT_WIDTH = { wide: 1240, narrow: 760, compact: 520 } as const;

export type ScreenWidth = keyof typeof DESKTOP_CONTENT_WIDTH;

/** True on web when the window is at least `DESKTOP_MIN_WIDTH` wide. Re-renders on resize. */
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
}

/** True on web when the window is at least `WIDE_DESKTOP_MIN_WIDTH` wide (see there). Re-renders on resize. */
export function useIsWideDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= WIDE_DESKTOP_MIN_WIDTH;
}
