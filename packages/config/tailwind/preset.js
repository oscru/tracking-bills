const nativewindPreset = require('nativewind/preset');

/**
 * Shared Tailwind/NativeWind preset. App-level `tailwind.config.js` files
 * pull this in and only add their own `content` globs.
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: [],
  presets: [nativewindPreset],
  // 'class' (not 'media') so NativeWind manages the dark class on web without
  // throwing from its color-scheme MutationObserver. It still tracks the OS
  // setting by default; an explicit toggle can override it later.
  darkMode: 'class',
  theme: {
    extend: {
      // Domain palette / typography tokens land here in the UI phase.
      colors: {},
    },
  },
  plugins: [],
};
