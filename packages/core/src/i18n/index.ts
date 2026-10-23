import type { CategoryLabelSource } from '../types';

export {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LOCALE_BY_LANGUAGE,
  currentLanguage,
  currentLocale,
  i18n,
  initI18n,
  isLanguage,
  resolveLanguage,
  translateMessage,
  type Language,
} from './instance';

/** Display label for a category — its literal, user-editable name. */
export function resolveCategoryLabel(category: CategoryLabelSource): string {
  return category.name;
}
