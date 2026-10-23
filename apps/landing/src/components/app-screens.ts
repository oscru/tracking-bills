/**
 * Real screenshots of the app, per language (demo data:
 * supabase/snippets/demo-seed.sql, plus demo-seed-en.sql for English).
 */
import type { ImageMetadata } from 'astro';

import type { Lang } from '../i18n';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/app-screens/*/*.webp', {
  eager: true,
});

function screen(lang: Lang, name: string): ImageMetadata {
  const file = files[`../assets/app-screens/${lang}/${name}.webp`];
  if (!file) throw new Error(`Missing screenshot ${lang}/${name}.webp`);
  return file.default;
}

export function screensFor(lang: Lang) {
  return {
    story: [
      'story-inicio',
      'story-monto',
      'story-movimientos',
      'story-analisis',
      'story-presupuestos',
      'story-objetivo',
      'story-personas',
    ].map((name) => screen(lang, name)),
    desktop: screen(lang, 'devices-desktop'),
    tablet: screen(lang, 'devices-tablet'),
    phone: screen(lang, 'devices-phone'),
  };
}
