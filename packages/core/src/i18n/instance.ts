import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources } from './resources';

/**
 * The app's translations: one i18next instance shared by the screens
 * (`useTranslation`) and by core code that produces text (friendly errors,
 * validation messages, formatting). Texts live in
 * `locales/<language>/<feature>.json` — one file per feature (namespace),
 * the same set in every language; Spanish is the source the types follow.
 */

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['es'];
  }
}

export const LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** For a device (or browser) in neither of our languages. */
export const DEFAULT_LANGUAGE: Language = 'en';

/** The locale numbers and dates are formatted with, per language. */
export const LOCALE_BY_LANGUAGE: Record<Language, string> = { es: 'es-MX', en: 'en-US' };

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * The first of `tags` (BCP 47, in preference order — e.g. the device's
 * languages) that we have, by its base language: `es-AR` → `es`. None → English.
 */
export function resolveLanguage(tags: readonly (string | null | undefined)[]): Language {
  for (const tag of tags) {
    const base = tag?.toLowerCase().split(/[-_]/)[0];
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

export const i18n = i18next;

/** Sets the instance up (synchronously — the texts are bundled) in `language`; later calls just switch to it. */
export function initI18n(language: Language): void {
  if (i18n.isInitialized) {
    if (i18n.language !== language) void i18n.changeLanguage(language);
    return;
  }
  void i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: LANGUAGES,
    defaultNS: 'common',
    ns: Object.keys(resources.es),
    interpolation: { escapeValue: false }, // React escapes already
    returnNull: false,
    initAsync: false,
  });
}

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;
}

/** The formatting locale for the current language — the default of every formatter in `utils`. */
export function currentLocale(): string {
  return LOCALE_BY_LANGUAGE[currentLanguage()];
}

/**
 * Validation messages are translation keys (`validation:emailRequired`), so
 * schemas stay plain module-level constants: this turns one into text in the
 * current language. Anything that isn't a key passes through unchanged.
 */
export function translateMessage(message: string | null | undefined): string | undefined {
  if (!message) return undefined;
  return i18n.exists(message) ? (i18n.t as (key: string) => string)(message) : message;
}
