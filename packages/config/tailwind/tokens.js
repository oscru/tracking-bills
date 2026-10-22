/**
 * "Lima + tinta" design tokens, shared by every app's Tailwind setup: the
 * NativeWind preset (`preset.js`) for the Expo app and the plain-web preset
 * (`web-preset.js`) for the Astro landing. Change a color here and both pick
 * it up.
 */
module.exports = {
  colors: {
    canvas: { DEFAULT: '#F6F7F9', dark: '#0B0D0F' },
    surface: { DEFAULT: '#FFFFFF', dark: '#16191D' },
    line: { DEFAULT: '#EDEFF2', dark: '#23272C' },
    ink: {
      DEFAULT: '#1A1D21',
      dark: '#F2F3F5',
      2: '#6B7280',
      '2-dark': '#9BA1A8',
      3: '#9CA3AF',
      '3-dark': '#6B7178',
    },
    lime: {
      DEFAULT: '#B9F227',
      ink: '#4D7C0F',
      'ink-dark': '#A3E635',
      tint: '#F2FBDC',
      'tint-dark': '#26310A',
    },
    pos: { DEFAULT: '#16A34A', dark: '#22C55E' },
    danger: {
      DEFAULT: '#E5484D',
      dark: '#F16A6E',
      tint: '#FCEAEA',
      'tint-dark': '#3A1619',
    },
    warning: {
      DEFAULT: '#B45309',
      dark: '#F3B25E',
      tint: '#FEF3E2',
      'tint-dark': '#2B1F0F',
    },
  },
  borderRadius: {
    card: '20px',
    ctl: '14px',
  },
  /** Lime → chartreuse → green, the "THE ACTION" gradient (see @repo/ui `LIME_GRADIENT`). */
  limeGradient: ['#E3FF6B', '#B9F227', '#8EE05A'],
};
