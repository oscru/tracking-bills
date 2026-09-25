import { useTransaction } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import { formatCurrency, formatDate } from '@repo/core/utils';
import { Chip, Fab, ListRow, PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: tx, isLoading } = useTransaction(id);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!tx) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Movimiento no encontrado.</Text>
      </Screen>
    );
  }

  const isTransfer = tx.type === 'transfer';
  const currency = tx.account?.currency ?? 'MXN';
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
  const amountClass = isTransfer
    ? 'text-ink dark:text-ink-dark'
    : tx.type === 'income'
      ? 'text-pos dark:text-pos-dark'
      : 'text-ink dark:text-ink-dark';

  const title = isTransfer
    ? 'Transferencia'
    : tx.category
      ? resolveCategoryLabel(tx.category)
      : 'Sin categoría';

  const goAccount = (accountId: string | null) => {
    if (!accountId) return;
    router.push({ pathname: '/(app)/settings/accounts/[id]', params: { id: accountId } });
  };
  const goCategory = () => {
    if (!tx.category) return;
    router.push({ pathname: '/(app)/settings/categories/[id]', params: { id: tx.category.id } });
  };
  const goTag = (tagId: string) =>
    router.push({ pathname: '/(app)/settings/tags/[id]', params: { id: tagId } });

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader title={title} onBack={() => router.back()} />

      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 pb-4"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center gap-1 rounded-card bg-surface p-6 dark:bg-surface-dark">
            <Text
              className={`text-4xl font-bold tracking-tight ${amountClass}`}
            >{`${sign}${formatCurrency(tx.amount, currency)}`}</Text>
            <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
              {formatDate(tx.transaction_date)}
            </Text>
            {tx.is_completed === false ? (
              <Text className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#B45309]">
                Pendiente
              </Text>
            ) : null}
          </View>

          <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
            {isTransfer ? (
              <>
                <ListRow
                  title="De"
                  subtitle={tx.account?.name}
                  showChevron
                  onPress={() => goAccount(tx.account_id)}
                />
                <View className="h-px bg-line dark:bg-line-dark" />
                <ListRow
                  title="A"
                  subtitle={tx.to_account?.name}
                  showChevron
                  onPress={() => goAccount(tx.to_account_id)}
                />
              </>
            ) : (
              <>
                <ListRow
                  title="Categoría"
                  subtitle={tx.category ? undefined : 'Sin categoría'}
                  dotColor={tx.category?.color}
                  showChevron={Boolean(tx.category)}
                  onPress={tx.category ? goCategory : undefined}
                />
                <View className="h-px bg-line dark:bg-line-dark" />
                <ListRow
                  title="Cuenta"
                  subtitle={tx.account?.name}
                  showChevron
                  onPress={() => goAccount(tx.account_id)}
                />
              </>
            )}
          </View>

          {tx.description ? (
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
                Descripción
              </Text>
              <Text className="text-base text-ink dark:text-ink-dark">{tx.description}</Text>
            </View>
          ) : null}

          {tx.tags.length > 0 ? (
            <View className="gap-2">
              <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Tags</Text>
              <View className="flex-row flex-wrap gap-2">
                {tx.tags.map((t) => (
                  <Chip key={t.id} label={t.name} dotColor={t.color} selected onPress={() => goTag(t.id)} />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View className="absolute bottom-6 right-5">
          <Fab
            icon="pencil"
            accessibilityLabel="Editar movimiento"
            onPress={() =>
              router.push({ pathname: '/(app)/transactions/[id]/edit', params: { id: tx.id } })
            }
          />
        </View>
      </View>
    </Screen>
  );
}
