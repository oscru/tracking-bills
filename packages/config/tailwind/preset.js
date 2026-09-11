const nativewindPreset = require('nativewind/preset');

/**
 * Shared Tailwind/NativeWind preset. App-level `tailwind.config.js` files
 * pull this in and only add their own `content` globs.
 *
 * Design system: "Lima + tinta" — an ink-primary UI with lime as the accent.
 * Semantic tokens carry explicit `-dark` siblings; write them as
 * `bg-surface dark:bg-surface-dark`, `text-ink dark:text-ink-dark`, etc.
 * `bg-lime` needs no dark variant (same hue both themes).
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: [],
  presets: [nativewindPreset],
  // 'class' (not 'media') so NativeWind manages the dark class on web without
  // throwing from its color-scheme MutationObserver.
  darkMode: 'class',
  theme: {
    extend: {
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
        danger: { DEFAULT: '#E5484D', dark: '#F16A6E' },
      },
      borderRadius: {
        card: '20px',
        ctl: '14px',
      },
    },
  },
  plugins: [],
};
