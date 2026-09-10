/**
 * i18n helpers that are UI-agnostic (no i18n library bound here).
 *
 * The app wires an actual translator (Phase 6, with the first category-rendering
 * screens). These helpers only produce the keys / pick the fallback so the
 * convention is fixed now.
 */
import type { CategoryLabelSource } from '../types';

/** Translation key for a default category slug: `categories.groceries`, … */
export function categoryTranslationKey(slug: string): `categories.${string}` {
  return `categories.${slug}`;
}

/**
 * Resolve a display label for a category.
 *
 * @param category  slug + name + is_default (from the DB row)
 * @param translate optional translator; given `categories.<slug>` it returns the
 *                  localized string, or a falsy value / the key itself if missing
 */
export function resolveCategoryLabel(
  category: CategoryLabelSource,
  translate?: (key: string) => string | undefined,
): string {
  if (category.is_default && category.slug) {
    const key = categoryTranslationKey(category.slug);
    const translated = translate?.(key);
    if (translated && translated !== key) return translated;
  }
  return category.name;
}
