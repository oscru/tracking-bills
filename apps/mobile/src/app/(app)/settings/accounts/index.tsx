import { useAccounts } from '@repo/core/hooks';
import type { AccountType } from '@repo/core/types';
import { formatCurrency } from '@repo/core/utils';
import { ListRow, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

const TYPE_LABEL: Record<AccountType, string> = {
  cash: 'Efectivo',
  bank: 'Banco',
  credit_card: 'Tarjeta de crédito',
};

export default function AccountsScreen() {
  const router = useRouter();
  const { data: accounts, isLoading, error } = useAccounts();

  return (
    <Screen className="gap-4">
      <View className="flex-row items-center justify-between pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">‹ Ajustes</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(app)/settings/accounts/new')} hitSlop={8}>
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Nueva</Text>
        </Pressable>
      </View>

      <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Cuentas</Text>

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <Text className="mt-8 text-center text-sm text-red-500">{error.message}</Text>
      ) : (
        <View className="rounded-2xl border border-neutral-200 px-4 dark:border-neutral-800">
          {(accounts ?? []).map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <View className="h-px bg-neutral-100 dark:bg-neutral-800" /> : null}
              <ListRow
                title={a.name}
                subtitle={`${TYPE_LABEL[a.type]}${a.archived ? ' · archivada' : ''}`}
                trailing={
                  <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                    {formatCurrency(Number(a.initial_balance), a.currency)}
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
