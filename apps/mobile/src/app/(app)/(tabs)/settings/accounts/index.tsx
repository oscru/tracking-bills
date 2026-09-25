import { useAccounts, useTransactions } from '@repo/core/hooks';
import { accountBalance, formatCurrency, toFriendlyMessage } from '@repo/core/utils';
import { ErrorCard, Fab, ListRow, PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { ACCOUNT_TYPE_LABEL } from '../../../../../features/accounts/account-types';

export default function AccountsScreen() {
  const router = useRouter();
  const { data: accounts, isLoading, error } = useAccounts();
  const { data: transactions } = useTransactions();

  return (
    <Screen className="gap-4">
      <PageHeader title="Cuentas" onBack={() => router.back()} />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, 'No se pudieron cargar las cuentas')} />
        </View>
      ) : (
        <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
          {(accounts ?? []).map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
              <ListRow
                title={a.name}
                subtitle={`${ACCOUNT_TYPE_LABEL[a.type]}${a.archived ? ' · archivada' : ''}`}
                dotColor={a.color}
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

      <View className="absolute bottom-6 right-5">
        <Fab
          accessibilityLabel="Nueva cuenta"
          onPress={() => router.push('/(app)/settings/accounts/new')}
        />
      </View>
    </Screen>
  );
}
