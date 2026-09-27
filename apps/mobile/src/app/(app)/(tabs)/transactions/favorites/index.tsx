import { Ionicons } from '@expo/vector-icons';
import { useFavoriteTransactions } from '@repo/core/hooks';
import type { FavoriteTransactionWithRefs } from '@repo/core/supabase';
import { formatCurrency } from '@repo/core/utils';
import { PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { favoriteTint } from '../../../../../features/favorites/favorite-colors';

export default function FavoritesScreen() {
  const router = useRouter();
  const { data: favorites, isLoading } = useFavoriteTransactions();

  return (
    <Screen className="gap-4">
      <PageHeader title="Favoritos" onBack={() => router.back()} />

      <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
        Tócalos en Movimientos para crear el gasto o ingreso en un toque, sin volver a escribirlo.
      </Text>

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="pb-24">
          <View className="flex-row flex-wrap justify-between">
            {(favorites ?? []).map((f) => (
              <FavoriteCard
                key={f.id}
                favorite={f}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/transactions/favorites/[id]/edit',
                    params: { id: f.id },
                  })
                }
              />
            ))}

            <Pressable
              onPress={() => router.push('/(app)/transactions/favorites/new')}
              style={{ width: '48%', marginBottom: 12 }}
              className="min-h-[112px] items-center justify-center gap-2 rounded-card border border-dashed border-line dark:border-line-dark"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full border border-dashed border-line dark:border-line-dark">
                <Ionicons name="add" size={20} color="#9CA3AF" />
              </View>
              <Text className="text-[13px] font-semibold text-ink-3 dark:text-ink-3-dark">
                Nuevo favorito
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function FavoriteCard({
  favorite,
  onPress,
}: {
  favorite: FavoriteTransactionWithRefs;
  onPress: () => void;
}) {
  const isTransfer = favorite.type === 'transfer';
  const { bg, fg } = favoriteTint(favorite);
  const currency = favorite.account?.currency ?? 'MXN';
  const subtitle = isTransfer
    ? `${favorite.account?.name ?? '—'} → ${favorite.to_account?.name ?? '—'}`
    : [favorite.account?.name, favorite.amount != null ? formatCurrency(favorite.amount, currency) : 'monto libre']
        .filter(Boolean)
        .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={{ width: '48%', marginBottom: 12 }}
      className="min-h-[112px] gap-2.5 rounded-card bg-surface p-4 dark:bg-surface-dark"
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: bg }}
      >
        <Ionicons name={favorite.icon as keyof typeof Ionicons.glyphMap} size={20} color={fg} />
      </View>
      <View>
        <Text className="text-sm font-bold text-ink dark:text-ink-dark" numberOfLines={1}>
          {favorite.label}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-2 dark:text-ink-2-dark" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
