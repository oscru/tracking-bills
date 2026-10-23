/**
 * Translates raw Supabase/Postgres/Auth errors into user-facing text (in the
 * current language — `errors` namespace), so forms never leak things like
 * `duplicate key value violates unique constraint "tags_user_name_key"` to
 * the screen.
 */
import type { ParseKeys } from 'i18next';

import { i18n } from '../i18n/instance';
import { AuthCallError, SupabaseError } from '../supabase';

type ErrorKey = ParseKeys<'errors'>;
const t = (key: ErrorKey, options?: Record<string, string>) =>
  i18n.t(key, { ns: 'errors', ...options });

/** Unique-constraint violations, keyed by Postgres constraint name. */
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, ErrorKey> = {
  tags_user_name_key: 'db.tagNameTaken',
  categories_user_slug_key: 'db.categorySlugTaken',
};

/** FK-restrict violations, keyed by the referencing constraint name. */
const FK_CONSTRAINT_MESSAGES: Record<string, ErrorKey> = {
  transactions_account_id_fkey: 'db.accountHasTransactions',
  transactions_to_account_id_fkey: 'db.accountHasTransactions',
};

/** Known Supabase Auth error codes. */
const AUTH_ERROR_MESSAGES: Record<string, ErrorKey> = {
  invalid_credentials: 'auth.invalidCredentials',
  user_already_exists: 'auth.userExists',
  email_exists: 'auth.userExists',
  weak_password: 'auth.weakPassword',
  email_not_confirmed: 'auth.emailNotConfirmed',
  over_email_send_rate_limit: 'tooManyAttempts',
  same_password: 'auth.samePassword',
  user_not_found: 'auth.userNotFound',
  otp_expired: 'auth.otpExpired',
  otp_disabled: 'auth.otpDisabled',
};

/** `check_violation` messages raised by our triggers, matched by their text. */
const CHECK_MESSAGES: [RegExp, ErrorKey][] = [
  [/peer_invite_invalid/, 'db.peerInviteInvalid'],
  [/peer_invite_own/, 'db.peerInviteOwn'],
  [/peer_already_linked/, 'db.peerAlreadyLinked'],
  [/no longer linked with this person|not linked with this person/, 'db.peerNotLinked'],
  [/received transfer can only be (changed|removed)/, 'db.peerTransferLocked'],
  [/arrives on its own/, 'db.peerArrivesOnItsOwn'],
  [/non-zero balance/, 'db.archiveNonZeroBalance'],
  [/cannot change type of a category that has subcategories/, 'db.categoryTypeWithChildren'],
  [/cannot disable currency .+ still in use/, 'db.currencyInUse'],
  [/cannot delete a system category/, 'db.systemCategory'],
  [/cannot delete a category that is not archived/, 'db.categoryNotArchived'],
  [/cannot delete a category that has transactions/, 'db.categoryHasTransactions'],
  [/cannot delete a category used by a favorite movement/, 'db.categoryInFavorite'],
  [/cannot delete a category assigned to a budget/, 'db.categoryInBudget'],
  [/is not usable by user .+ for a .+ transaction/, 'db.categoryWrongType'],
  [/cannot change (currency|initial_balance) after account creation/, 'db.accountLockedFields'],
];

function constraintNameFrom(message: string): string | null {
  return /constraint "([^"]+)"/.exec(message)?.[1] ?? null;
}

function fromSupabaseError(error: SupabaseError): string | null {
  const constraint = constraintNameFrom(error.message);
  switch (error.code) {
    case '23505': // unique_violation
      return t((constraint && UNIQUE_CONSTRAINT_MESSAGES[constraint]) || 'db.duplicate');
    case '23503': // foreign_key_violation
      return t((constraint && FK_CONSTRAINT_MESSAGES[constraint]) || 'db.related');
    case '23502': // not_null_violation
      return t('db.missingField');
    case '23514': {
      // check_violation
      const noReceive = /peer_no_receive_account:([A-Z]{3}):(.*)$/.exec(error.message);
      if (noReceive) {
        return t('db.peerNoReceiveAccount', {
          who: noReceive[2]?.trim() || t('db.peerSomeone'),
          currency: noReceive[1] ?? '',
        });
      }
      const known = CHECK_MESSAGES.find(([pattern]) => pattern.test(error.message));
      return t(known?.[1] ?? 'db.checkData');
    }
    case '42501': // insufficient_privilege (RLS)
      return t('db.forbidden');
    default:
      return null;
  }
}

function fromAuthError(error: AuthCallError): string | null {
  const mapped = error.code ? AUTH_ERROR_MESSAGES[error.code] : undefined;
  if (mapped) return t(mapped);
  if (error.status === 429) return t('tooManyAttempts');
  return null;
}

/**
 * Turn a thrown error into user-facing text. Falls back to `fallback` for
 * anything not recognized (network errors, unmapped Postgres/Auth codes,
 * non-Error throws) — raw driver/DB messages never reach the UI.
 */
export function toFriendlyMessage(error: unknown, fallback: string): string {
  if (error instanceof SupabaseError) return fromSupabaseError(error) ?? fallback;
  if (error instanceof AuthCallError) return fromAuthError(error) ?? fallback;
  if (error instanceof Error && /network request failed|failed to fetch/i.test(error.message)) {
    return t('noConnection');
  }
  return fallback;
}
