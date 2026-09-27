import { Ionicons } from '@expo/vector-icons';
import { useFavoriteTransactions } from '@repo/core/hooks';
import type { FavoriteTransactionWithRefs } from '@repo/core/supabase';
import { todayISODate } from '@repo/core/utils';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { draftTransactionStore } from '../transactions/draft-transaction-store';
import { favoriteTint } from './favorite-colors';

/** Horizontal row of saved shortcuts atop the transactions list — tap one to
 * seed the "new movement" draft and jump straight to confirming the amount. */
export function FavoritesRow() {
  const router = useRouter();
  const { data: favorites } = useFavoriteTransactions();

  const openFromFavorite = (f: FavoriteTransactionWithRefs) => {
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
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-ink-2 dark:text-ink-2-dark">Favoritos</Text>
        <Pressable onPress={() => router.push('/(app)/transactions/favorites')} hitSlop={8}>
          <Text className="text-[12px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            Ver todos ›
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-4"
      >
        {favorites.map((f) => {
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
              <Text
                className="text-[11px] font-medium text-ink dark:text-ink-dark"
                numberOfLines={1}
              >
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
      </ScrollView>
    </View>
  );
}
