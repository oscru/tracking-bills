/**
 * Raw hex values mirroring `@repo/config/tailwind/preset`'s "Lima + tinta"
 * color tokens, for the one place NativeWind classes can't reach: a native
 * prop that wants an actual color string (`Ionicons`'s `color`, RN's
 * `style.color`/`backgroundColor`/`tintColor`, etc.) instead of a
 * `className`. Keep this in sync with `preset.js` by hand — there's no
 * tooling wiring the two together automatically.
 *
 * This does NOT make color selection theme-aware by itself: a call site
 * that already branches on `useColorScheme()` should reference both the
 * base and `*Dark` entry (e.g. `dark ? ICON_COLORS.posDark : ICON_COLORS.pos`);
 * a call site that only ever used the light value before this still only
 * uses `ICON_COLORS.pos` — this module only centralizes the literals, it
 * doesn't add dark-mode support where there wasn't any.
 */
export const ICON_COLORS = {
  ink: '#1A1D21',
  inkDark: '#F2F3F5',
  ink2: '#6B7280',
  ink2Dark: '#9BA1A8',
  ink3: '#9CA3AF',
  ink3Dark: '#6B7178',
  lime: '#B9F227',
  limeInk: '#4D7C0F',
  limeInkDark: '#A3E635',
  limeTint: '#F2FBDC',
  limeTintDark: '#26310A',
  pos: '#16A34A',
  posDark: '#22C55E',
  danger: '#E5484D',
  dangerDark: '#F16A6E',
  warning: '#B45309',
  warningDark: '#F3B25E',
  surface: '#FFFFFF',
  surfaceDark: '#16191D',
  line: '#EDEFF2',
  lineDark: '#23272C',
  canvas: '#F6F7F9',
  canvasDark: '#0B0D0F',
} as const;
