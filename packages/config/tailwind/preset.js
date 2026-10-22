const nativewindPreset = require('nativewind/preset');

const tokens = require('./tokens');

/**
 * Shared Tailwind/NativeWind preset. App-level `tailwind.config.js` files
 * pull this in and only add their own `content` globs.
 *
 * Design system: "Lima + tinta" (tokens live in `tokens.js`) — an ink-primary UI with lime as the accent.
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
      colors: tokens.colors,
      borderRadius: tokens.borderRadius,
    },
  },
  plugins: [],
};
