/** Where the theme switch was tapped — the reveal grows from here (web). */
export type TransitionOrigin = { x: number; y: number };

/**
 * Native: no transition, the scheme just switches. The web version
 * (`theme-transition.web.ts`) reveals the new theme in a growing circle.
 */
export function withThemeTransition(apply: () => void, _origin?: TransitionOrigin) {
  apply();
}
