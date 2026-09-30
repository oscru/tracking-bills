import { Ionicons } from '@expo/vector-icons';
import { useFavoriteTransactions, useRecordFavoriteTransactionUse } from '@repo/core/hooks';
import type { FavoriteTransactionWithRefs } from '@repo/core/supabase';
import { todayISODate, topFavorites } from '@repo/core/utils';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { draftTransactionStore } from '../transactions/draft-transaction-store';
import { favoriteTint } from './favorite-colors';

/**
 * Horizontal row of saved shortcuts atop the transactions list, "stories"
 * style — tap one to seed the "new movement" draft and jump straight to
 * confirming the amount. Features at most 6, ranked by actual use
 * (most-tapped first) rather than creation order, so the ones that surface
 * are the ones actually relied on.
 *
 * A plain, always-shown row — a scroll-driven show/hide animation was tried
 * here (twice, with different animation techniques) and glitched both
 * times, so it's just a normal fixed element above the search bar now.
 */
export function FavoritesRow() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const { data: favorites } = useFavoriteTransactions();
  const recordUse = useRecordFavoriteTransactionUse();

  const featured = useMemo(() => topFavorites(favorites ?? []), [favorites]);

  const openFromFavorite = (f: FavoriteTransactionWithRefs) => {
    recordUse.mutate(f.id);
    draftTransactionStore.seed({
      view: 'amount',
      type: f.type,
      amount: f.amount != null ? String(f.amount) : '',
      accountId: f.account_id,
      toAccountId: f.to_account_id,
      categoryId: f.category_id,
      tagIds: [],
      description: f.description ?? '',
      date: todayISODate(),
      isCompleted: true,
    });
    router.push('/(app)/new-transaction');
  };

  // Loading (undefined): render nothing rather than flash an empty row.
  // Loaded-but-empty ([]): still show the header + "Nuevo" tile, to invite
  // first use.
  if (!favorites) return null;

  return (
    <View className="gap-2 pb-2">
      <Text className="text-[13px] font-semibold text-ink-2 dark:text-ink-2-dark">Favoritos</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4">
        {featured.map((f) => {
          const { bg, fg } = favoriteTint(f);
          return (
            <Pressable
              key={f.id}
              onPress={() => openFromFavorite(f)}
              className="w-14 items-center gap-1.5"
            >
              <View
                className="h-[52px] w-[52px] items-center justify-center rounded-full"
                style={{ backgroundColor: bg }}
              >
                <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={22} color={fg} />
              </View>
              <Text className="text-[11px] font-medium text-ink dark:text-ink-dark" numberOfLines={1}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => router.push('/(app)/transactions/favorites/new')}
          className="w-14 items-center gap-1.5"
        >
          <View className="h-[52px] w-[52px] items-center justify-center rounded-full border border-dashed border-line dark:border-line-dark">
            <Ionicons name="add" size={20} color="#9CA3AF" />
          </View>
          <Text className="text-[11px] font-medium text-ink-3 dark:text-ink-3-dark">Nuevo</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(app)/transactions/favorites')}
          className="w-14 items-center gap-1.5"
        >
          <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-ink dark:bg-ink-dark">
            <Ionicons name="arrow-forward" size={20} color={dark ? '#16191D' : '#FFFFFF'} />
          </View>
          <Text className="text-[11px] font-medium text-ink dark:text-ink-dark" numberOfLines={1}>
            Ver todas
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
