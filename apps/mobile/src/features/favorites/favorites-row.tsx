import { Ionicons } from '@expo/vector-icons';
import { useFavoriteTransactions, useRecordFavoriteTransactionUse } from '@repo/core/hooks';
import type { FavoriteTransactionWithRefs } from '@repo/core/supabase';
import { todayISODate, topFavorites } from '@repo/core/utils';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, Text, View, useColorScheme } from 'react-native';

import { draftTransactionStore } from '../transactions/draft-transaction-store';
import { favoriteTint } from './favorite-colors';

interface Props {
  /** Collapses the row (height + fade) when false — driven by the list's scroll direction. Defaults to shown. */
  visible?: boolean;
}

/**
 * Horizontal row of saved shortcuts atop the transactions list, "stories"
 * style — tap one to seed the "new movement" draft and jump straight to
 * confirming the amount. Features at most 6, ranked by actual use
 * (most-tapped first) rather than creation order, so the ones that surface
 * are the ones actually relied on.
 */
export function FavoritesRow({ visible = true }: Props) {
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const { data: favorites } = useFavoriteTransactions();
  const recordUse = useRecordFavoriteTransactionUse();

  // eslint-disable-next-line react-hooks/refs -- imperative Animated.Value handle, not a render read
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // driving height, which the native driver can't animate
    }).start();
  }, [visible, progress]);

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
    <Collapse progress={progress}>
      <View className="gap-2 pb-2">
        <Text className="text-[13px] font-semibold text-ink-2 dark:text-ink-2-dark">Favoritos</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-4"
        >
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
    </Collapse>
  );
}

/**
 * Collapses `children` (height + fade) as `progress` animates between 0 and
 * 1. Takes the Animated.Value as a prop rather than reading a ref directly —
 * `.interpolate()` on a ref-derived value inside its *own* component trips
 * `react-hooks/refs`, but the same call on a prop one level down doesn't
 * (same reasoning as `SwipeAction`/`SwipeFill` in `TransactionListItem`,
 * which take their Animated values as props for the same reason).
 */
function Collapse({ progress, children }: { progress: Animated.Value; children: ReactNode }) {
  const [height, setHeight] = useState(0);
  return (
    <Animated.View
      style={{
        opacity: progress,
        height: height ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) : undefined,
        overflow: 'hidden',
      }}
    >
      <View onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>{children}</View>
    </Animated.View>
  );
}
