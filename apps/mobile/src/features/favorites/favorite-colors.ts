import type { FavoriteTransactionWithRefs } from '@repo/core/supabase';

/**
 * Icon tint for a favorite card/shortcut: the linked category's own color
 * (like `TransactionListItem`'s row dot), or the app's neutral transfer
 * treatment when it has none (transfers never carry a category).
 */
export function favoriteTint(
  favorite: Pick<FavoriteTransactionWithRefs, 'type' | 'category'>,
): { bg: string; fg: string } {
  if (favorite.type === 'transfer') return { bg: '#F2FBDC', fg: '#4D7C0F' };
  const color = favorite.category?.color ?? '#94A3B8';
  return { bg: color + '1F', fg: color };
}
