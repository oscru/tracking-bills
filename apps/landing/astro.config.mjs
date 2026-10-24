import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

// The config runs before Vite loads the .env files, so load them here: dev
// reads .env.development, build reads .env.production (env vars set in the
// shell or in Vercel win over both).
const mode = process.argv.includes('dev') ? 'development' : 'production';
const env = loadEnv(mode, process.cwd(), 'PUBLIC_');

// Static marketing site.
export default defineConfig({
  // Canonical URLs, sitemap and hreflang.
  site: env.PUBLIC_SITE_URL,
  // `/en`, `/privacidad` — no trailing slash: each page is built as a file
  // (`en.html`) and Vercel serves it without the extension (vercel.json).
  trailingSlash: 'never',
  build: { format: 'file' },
  // Spanish at the root, English under /en (see src/i18n).
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [sitemap()],
});
