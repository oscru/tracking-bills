import type { TransactionType } from '@repo/core/types';
import { useTransactions } from '@repo/core/hooks';
import { Fab, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { TransactionListItem } from '../../../features/transactions/transaction-list-item';

const TITLE: Record<TransactionType, string> = {
  income: 'Ingresos',
  expense: 'Gastos',
  transfer: 'Transferencias',
};

export default function TransactionsScreen() {
  const router = useRouter();
  const { type, from, to, accountId } = useLocalSearchParams<{
    type?: TransactionType;
    from?: string;
    to?: string;
    accountId?: string;
  }>();
  const filtered = Boolean(type || from || to || accountId);

  const {
    data: transactions,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useTransactions({ type, from, to, accountId });

  return (
    <Screen className="gap-4">
      <View className="gap-1 pt-2">
        <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
          {type ? TITLE[type] : 'Movimientos'}
        </Text>
        {filtered ? (
          <Pressable
            onPress={() => router.setParams({ type: '', from: '', to: '', accountId: '' })}
          >
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              × Quitar filtro
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <Text className="mt-8 text-center text-sm text-danger dark:text-danger-dark">
          {error.message}
        </Text>
      ) : (
        <FlatList
          data={transactions ?? []}
          keyExtractor={(t) => t.id}
          className="flex-1"
          contentContainerClassName="pb-24"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          ItemSeparatorComponent={() => <View className="h-px bg-line dark:bg-line-dark" />}
          ListEmptyComponent={
            <View className="mt-16 items-center gap-1">
              <Text className="text-base font-semibold text-ink dark:text-ink-dark">
                Sin movimientos todavía
              </Text>
              <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
                {filtered
                  ? 'No hay movimientos con este filtro.'
                  : 'Toca el botón + para registrar el primero.'}
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
