import type { CategoryLabelSource } from '../types';

/** Display label for a category — its literal, user-editable name. */
export function resolveCategoryLabel(category: CategoryLabelSource): string {
  return category.name;
}
