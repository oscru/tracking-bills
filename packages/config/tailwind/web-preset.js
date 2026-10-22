const tokens = require('./tokens');

/**
 * Tailwind preset for plain-web apps (the Astro landing). Same "Lima + tinta"
 * tokens as the NativeWind preset, without NativeWind, so a web app doesn't
 * pull in React Native. Dark mode follows the OS (`media`).
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: [],
  darkMode: 'media',
  theme: {
    extend: {
      colors: tokens.colors,
      borderRadius: tokens.borderRadius,
    },
  },
  plugins: [],
};
