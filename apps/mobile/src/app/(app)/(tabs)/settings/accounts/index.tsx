import { useAccounts, useTransactions } from '@repo/core/hooks';
import { accountBalance, formatCurrency } from '@repo/core/utils';
import { ListRow, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ACCOUNT_TYPE_LABEL } from '../../../../../features/accounts/account-types';

export default function AccountsScreen() {
  const router = useRouter();
  const { data: accounts, isLoading, error } = useAccounts();
  const { data: transactions } = useTransactions();

  return (
    <Screen className="gap-4">
      <View className="flex-row items-center justify-between pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">‹ Ajustes</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(app)/settings/accounts/new')} hitSlop={8}>
          <Text className="text-sm font-semibold text-ink dark:text-ink-dark">Nueva</Text>
        </Pressable>
      </View>

      <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Cuentas</Text>

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <Text className="mt-8 text-center text-sm text-danger dark:text-danger-dark">
          {error.message}
        </Text>
      ) : (
        <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
          {(accounts ?? []).map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
              <ListRow
                title={a.name}
                subtitle={`${ACCOUNT_TYPE_LABEL[a.type]}${a.archived ? ' · archivada' : ''}`}
                trailing={
                  <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
                    {formatCurrency(accountBalance(a, transactions ?? []), a.currency)}
                  </Text>
                }
                showChevron
                onPress={() =>
                  router.push({
                    pathname: '/(app)/settings/accounts/[id]',
                    params: { id: a.id },
                  })
                }
              />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
