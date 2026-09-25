/**
 * Translates raw Supabase/Postgres/Auth errors into user-facing Spanish
 * text, so forms never leak things like `duplicate key value violates
 * unique constraint "tags_user_name_key"` to the screen.
 */
import { AuthCallError, SupabaseError } from '../supabase';

/** Friendly text for unique-constraint violations, keyed by Postgres constraint name. */
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  tags_user_name_key: 'Ya tienes una tag con ese nombre.',
  categories_user_slug_key: 'Ya existe una categoría con ese identificador.',
};

/** Friendly text for FK-restrict violations, keyed by the referencing constraint name. */
const FK_CONSTRAINT_MESSAGES: Record<string, string> = {
  transactions_account_id_fkey:
    'No puedes eliminar esta cuenta porque tiene movimientos asociados. Archívala en su lugar.',
  transactions_to_account_id_fkey:
    'No puedes eliminar esta cuenta porque tiene movimientos asociados. Archívala en su lugar.',
};

/** Friendly text for known Supabase Auth error codes. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  user_already_exists: 'Ya existe una cuenta con ese correo.',
  email_exists: 'Ya existe una cuenta con ese correo.',
  weak_password: 'La contraseña es muy débil. Usa al menos 8 caracteres.',
  email_not_confirmed: 'Confirma tu correo antes de iniciar sesión.',
  over_email_send_rate_limit: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  same_password: 'La nueva contraseña debe ser distinta a la actual.',
  user_not_found: 'No encontramos una cuenta con ese correo.',
};

function constraintNameFrom(message: string): string | null {
  return /constraint "([^"]+)"/.exec(message)?.[1] ?? null;
}

function fromSupabaseError(error: SupabaseError): string | null {
  const constraint = constraintNameFrom(error.message);
  switch (error.code) {
    case '23505': // unique_violation
      return (constraint && UNIQUE_CONSTRAINT_MESSAGES[constraint]) || 'Ya existe un registro con esos datos.';
    case '23503': // foreign_key_violation
      return (
        (constraint && FK_CONSTRAINT_MESSAGES[constraint]) ||
        'No se puede completar la acción porque hay datos relacionados.'
      );
    case '23502': // not_null_violation
      return 'Falta completar un campo requerido.';
    case '23514': // check_violation
      return 'Revisa los datos ingresados.';
    case '42501': // insufficient_privilege (RLS)
      return 'No tienes permiso para hacer esto.';
    default:
      return null;
  }
}

function fromAuthError(error: AuthCallError): string | null {
  const mapped = error.code ? AUTH_ERROR_MESSAGES[error.code] : undefined;
  if (mapped) return mapped;
  if (error.status === 429) return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
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
    return 'No hay conexión a internet. Revisa tu conexión e intenta de nuevo.';
  }
  return fallback;
}
