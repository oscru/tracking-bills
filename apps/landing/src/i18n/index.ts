/**
 * The site's two languages. Spanish lives at the root (`/`, `/privacidad`),
 * English under `/en/` (`/en/`, `/en/privacy`). Texts are in
 * `locales/<lang>/<section>.json` — one file per section, the same set in
 * both languages; Spanish is the source the types follow.
 */
import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enLegal from './locales/en/legal.json';
import enStory from './locales/en/story.json';
import esCommon from './locales/es/common.json';
import esHome from './locales/es/home.json';
import esLegal from './locales/es/legal.json';
import esStory from './locales/es/story.json';

export const LANGS = ['es', 'en'] as const;
export type Lang = (typeof LANGS)[number];

const es = { common: esCommon, home: esHome, story: esStory, legal: esLegal };

type Shape<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Shape<U>[]
    : { [K in keyof T]: Shape<T[K]> };

// `satisfies` makes English fail to typecheck if it misses a text Spanish has.
const en = { common: enCommon, home: enHome, story: enStory, legal: enLegal } satisfies Shape<
  typeof es
>;

const DICTIONARIES: Record<Lang, typeof es> = { es, en };

/** Every page, by language — the legal ones have translated slugs. */
export const PAGES = {
  home: { es: '/', en: '/en/' },
  terms: { es: '/terminos', en: '/en/terms' },
  privacy: { es: '/privacidad', en: '/en/privacy' },
  cookies: { es: '/cookies', en: '/en/cookies' },
} as const satisfies Record<string, Record<Lang, string>>;
export type Page = keyof typeof PAGES;

/** The language of the page being rendered (Astro's i18n routing sets it). */
export function langOf(astro: { currentLocale?: string }): Lang {
  return astro.currentLocale === 'en' ? 'en' : 'es';
}

export function texts(lang: Lang) {
  return DICTIONARIES[lang];
}

/** Fills `{name}` placeholders. */
export function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
