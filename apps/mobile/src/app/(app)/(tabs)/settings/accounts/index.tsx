import { useAccounts, useTransactions } from '@repo/core/hooks';
import { accountBalance, formatCurrency, toFriendlyMessage } from '@repo/core/utils';
import {
  AccountsEmptyIllustration,
  EmptyState,
  ErrorCard,
  ListRow,
  PageHeader,
  Screen,
  StaggerItem,
  useTabBarScrollPadding,
} from '@repo/ui';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { ActivityIndicator, Text, View, ScrollView } from 'react-native';

import { AccountIcon } from '../../../../../features/accounts/account-icon';
import { ACCOUNT_TYPE_LABEL } from '../../../../../features/accounts/account-types';
import { useTabBarAction } from '../../../../../features/navigation/floating-tab-bar';

export default function AccountsScreen() {
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const { data: accounts, isLoading, error } = useAccounts();
  const { data: transactions } = useTransactions();

  useTabBarAction({
    icon: Plus,
    accessibilityLabel: 'Nueva cuenta',
    onPress: () => router.push('/(app)/settings/accounts/new'),
  });

  return (
    <Screen edges={['top']} className="gap-4">
      <PageHeader title="Cuentas" onBack={() => router.back()} />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, 'No se pudieron cargar las cuentas')} />
        </View>
      ) : (accounts ?? []).length === 0 ? (
        <EmptyState
          illustration={<AccountsEmptyIllustration />}
          title="Aún no tienes cuentas"
          description="Crea una cuenta para empezar a registrar tus movimientos."
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: scrollPadding }}
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
            {(accounts ?? []).map((a, i) => (
              <StaggerItem key={a.id} index={i}>
                {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
                <ListRow
                  title={a.name}
                  subtitle={`${ACCOUNT_TYPE_LABEL[a.type]}${a.archived ? ' · archivada' : ''}`}
                  leading={<AccountIcon account={a} />}
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
              </StaggerItem>
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
