import { useSignOut, useTransactions } from '@repo/core/hooks';
import { Button, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

// TODO(auth): DEV-ONLY. Remove this import and the `setDevAuthBypass(false)` call
// in the sign-out handler once the dev bypass is gone.
import { setDevAuthBypass } from '../../features/auth/dev-auth-bypass';
import { TransactionListItem } from '../../features/transactions/transaction-list-item';

export default function TransactionsScreen() {
  const router = useRouter();
  const signOut = useSignOut();
  const { data: transactions, isLoading, isRefetching, refetch, error } = useTransactions();

  const onSignOut = () => {
    setDevAuthBypass(false); // TODO(auth): DEV-ONLY — remove with the bypass.
    signOut.mutate();
  };

  return (
    <Screen className="gap-4">
      <View className="flex-row items-center justify-between pt-2">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Transactions
        </Text>
        <Pressable onPress={onSignOut} hitSlop={8}>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">Sign out</Text>
        </Pressable>
      </View>

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
                No transactions yet
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                Tap “Add” to record your first one.
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

      <View className="absolute inset-x-5 bottom-6">
        <Button label="Add transaction" onPress={() => router.push('/(app)/transactions/new')} />
      </View>
    </Screen>
  );
}
