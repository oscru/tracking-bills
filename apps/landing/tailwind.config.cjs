const preset = require('@repo/config/tailwind/web-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,ts,md,mdx}'],
  presets: [preset],
};
