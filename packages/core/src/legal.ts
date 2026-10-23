/**
 * The legal documents — Aviso de privacidad, Política de cookies and
 * Términos y condiciones — are published together on the landing site and
 * versioned together. Bump `LEGAL_VERSION` whenever any of them changes in
 * substance: everyone whose `profiles.legal_version` differs is asked to
 * accept the new version before going into the app.
 *
 * Deliberately dependency-free, like `home-layout.ts`.
 */
export const LEGAL_VERSION = '2026-10-22';

/** Paths on the landing site (`apps/landing/src/pages/…`), per language. */
export const LEGAL_PATHS = {
  es: { privacy: '/privacidad', cookies: '/cookies', terms: '/terminos' },
  en: { privacy: '/en/privacy', cookies: '/en/cookies', terms: '/en/terms' },
} as const;

export type LegalDocument = keyof (typeof LEGAL_PATHS)['es'];
