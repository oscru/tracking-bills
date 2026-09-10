import { useTransactions } from '@repo/core/hooks';
import { Fab, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';

import { TransactionListItem } from '../../../features/transactions/transaction-list-item';

export default function TransactionsScreen() {
  const router = useRouter();
  const { data: transactions, isLoading, isRefetching, refetch, error } = useTransactions();

  return (
    <Screen className="gap-4">
      <Text className="pt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Movimientos
      </Text>

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <Text className="mt-8 text-center text-sm text-red-500">{error.message}</Text>
      ) : (
        <FlatList
          data={transactions ?? []}
          keyExtractor={(t) => t.id}
          className="flex-1"
          contentContainerClassName="pb-24"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-neutral-100 dark:bg-neutral-800" />
          )}
          ListEmptyComponent={
            <View className="mt-16 items-center gap-1">
              <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">
                Sin movimientos todavía
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                Toca el botón + para registrar el primero.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TransactionListItem
              transaction={item}
              onPress={() =>
                router.push({
                  pathname: '/(app)/transactions/[id]',
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      )}

      <View className="absolute bottom-6 right-5">
        <Fab
          accessibilityLabel="Nuevo movimiento"
          onPress={() => router.push('/(app)/transactions/new')}
        />
      </View>
    </Screen>
  );
}
