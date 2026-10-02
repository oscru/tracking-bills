import type { AccountType } from '../types';

/** Checked in order — more specific patterns (e.g. "tarjeta de crédito")
 * must come before generic ones (e.g. bare "crédito") so a credit card
 * doesn't get misread as a loan. Spanish and English, accent-insensitive. */
const PATTERNS: { type: AccountType; test: RegExp }[] = [
  { type: 'cash', test: /efectivo|cash|caja chica|\bcaja\b/ },
  { type: 'savings', test: /ahorro|savings/ },
  { type: 'credit_card', test: /tarjeta|credit card|\btdc\b|visa|mastercard|amex/ },
  { type: 'loan', test: /prestamo|hipoteca|hipotecario|\bloan\b/ },
  { type: 'investment', test: /inversion|investment|\bbroker\b|\bafore\b|fondo de inversion/ },
  { type: 'credit', test: /credito|\bcredit\b/ },
];

/** Strips accents so "Crédito"/"credito" match the same (unaccented) pattern. */
function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Best-effort guess at an account's type from its name alone — the only clue
 * available, since the reference import format carries no account-type
 * column at all. A debit/checking account is the fallback when nothing
 * matches, same as every account this heuristic replaces used to get
 * unconditionally. Wrong guesses aren't destructive: `type` isn't locked
 * after creation (unlike `currency`/`initial_balance`), so a misclassified
 * import is a one-tap fix in "Editar cuenta", not a dead end.
 */
export function guessAccountType(name: string): AccountType {
  const normalized = normalize(name);
  // "Tarjeta de débito" explicitly says debit — check before the generic
  // "tarjeta" -> credit_card pattern below would otherwise claim it.
  if (/tarjeta.*debito|debito.*tarjeta/.test(normalized)) return 'debit';
  for (const { type, test } of PATTERNS) {
    if (test.test(normalized)) return type;
  }
  return 'debit';
}
