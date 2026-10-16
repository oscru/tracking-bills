import { Platform, useWindowDimensions } from 'react-native';

/**
 * Web wider than this gets the desktop layout: a sidebar instead of the
 * floating tab bar, wider content, dialogs instead of bottom sheets. Below
 * it — phones, and narrow browser windows — the web app looks exactly like
 * the mobile one. Native is never "desktop".
 */
export const DESKTOP_MIN_WIDTH = 1024;

/** Content widths on desktop: `wide` for dashboards and lists, `narrow` for details and settings, `compact` for focused forms (the calculator). */
export const DESKTOP_CONTENT_WIDTH = { wide: 1240, narrow: 760, compact: 520 } as const;

export type ScreenWidth = keyof typeof DESKTOP_CONTENT_WIDTH;

/** True on web when the window is at least `DESKTOP_MIN_WIDTH` wide. Re-renders on resize. */
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
}
