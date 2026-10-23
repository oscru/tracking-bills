import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// Static marketing site. `site` feeds canonical URLs and the sitemap; set
// PUBLIC_SITE_URL in Vercel once the real domain is connected.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://genobills.vercel.app',
  // Spanish at the root, English under /en/ (see src/i18n).
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [sitemap()],
});
