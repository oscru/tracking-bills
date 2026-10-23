import { useTranslation } from 'react-i18next';

/**
 * Messages handed to `TextField`/`ErrorCard` may be translation keys (the
 * validators' `validation:…` messages): this shows the text for the
 * current language. Anything that isn't a key is shown as it is.
 */
export function useTranslatedMessage(message: string | null | undefined): string | undefined {
  const { t, i18n } = useTranslation();
  if (!message) return undefined;
  return i18n.exists(message) ? (t as (key: string) => string)(message) : message;
}
