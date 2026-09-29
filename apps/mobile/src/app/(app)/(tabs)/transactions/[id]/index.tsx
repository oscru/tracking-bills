import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useCategories, useTransaction, useTransactions } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import {
  accountBalance,
  formatActivityMoment,
  formatCurrency,
  formatDate,
  formatDateTime,
  projectedAccountBalance,
} from '@repo/core/utils';
import { BottomSheet, Chip, Fab, IconButton, ListRow, PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ACCOUNT_TYPE_ICON } from '../../../../../features/accounts/account-types';

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: tx, isLoading } = useTransaction(id);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  // Unfiltered — needed to reconstruct each account's balance as of this
  // transaction, not just its current one.
  const { data: allTransactions } = useTransactions();
  const [activityOpen, setActivityOpen] = useState(false);

  const account = (accounts ?? []).find((a) => a.id === tx?.account_id) ?? null;
  const toAccount = (accounts ?? []).find((a) => a.id === tx?.to_account_id) ?? null;
  const parentCategory =
    (categories ?? []).find((c) => c.id === tx?.category?.parent_id) ?? null;

  // Each account's balance right before this transaction, and right after.
  // A settled transaction gets its actual historical before/after, in ledger
  // order (by date, then creation time on the same day). A still-pending one
  // hasn't happened yet, so it isn't "placed" in that order at all — its
  // "before" is just the account's current real balance right now, and
  // "after" is that plus its own effect (`projectedAccountBalance`), so the
  // projection always tracks today's real money instead of a snapshot frozen
  // at whatever date the pending movement happens to be filed under.
  const balances = useMemo(() => {
    const empty = { accountBefore: null, accountAfter: null, toAccountBefore: null, toAccountAfter: null };
    if (!tx || !allTransactions) return empty;
    const before =
      tx.is_completed === false
        ? allTransactions
        : allTransactions.filter((t) =>
            t.transaction_date === tx.transaction_date
              ? t.created_at < tx.created_at
              : t.transaction_date < tx.transaction_date,
          );
    return {
      accountBefore: account ? accountBalance(account, before) : null,
      accountAfter: account ? projectedAccountBalance(account, before, tx) : null,
      toAccountBefore: toAccount ? accountBalance(toAccount, before) : null,
      toAccountAfter: toAccount ? projectedAccountBalance(toAccount, before, tx) : null,
    };
  }, [tx, allTransactions, account, toAccount]);

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
      : 'text-danger dark:text-danger-dark';

  const categoryLabel = tx.category
    ? parentCategory
      ? `${resolveCategoryLabel(parentCategory)} › ${resolveCategoryLabel(tx.category)}`
      : resolveCategoryLabel(tx.category)
    : 'Sin categoría';
  const description = tx.description?.trim();
  const title = isTransfer ? 'Transferencia' : description || categoryLabel;

  const goAccount = (accountId: string | null) => {
    if (!accountId) return;
    router.push({ pathname: '/(app)/settings/accounts/[id]', params: { id: accountId } });
  };
  const goGoal = (goalId: string | null) => {
    if (!goalId) return;
    router.push({ pathname: '/(app)/settings/goals/[id]', params: { id: goalId } });
  };
  const goCategory = () => {
    if (!tx.category) return;
    // `settings/categories/[id]` lives in the settings tab's own nested
    // stack — pushing into it from here switches tabs and leaves that stack
    // with only this one screen, so its default `router.back()` has nowhere
    // correct to pop to and bubbles all the way out to the home tab instead
    // of back to this transaction. Pass our id along so its back button can
    // route here explicitly instead of relying on that broken pop.
    router.push({
      pathname: '/(app)/settings/categories/[id]',
      params: { id: tx.category.id, fromTransactionId: tx.id },
    });
  };
  const goTag = (tagId: string) =>
    router.push({ pathname: '/(app)/settings/tags/[id]', params: { id: tagId } });

  const goSaveFavorite = () => {
    router.push({
      pathname: '/(app)/transactions/favorites/new',
      params: {
        type: tx.type,
        accountId: tx.account_id,
        toAccountId: tx.to_account_id ?? undefined,
        categoryId: tx.category_id ?? undefined,
        description: tx.description ?? undefined,
      },
    });
  };

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader
        title={title}
        onBack={() => router.back()}
        action={
          <IconButton
            icon="heart-outline"
            onPress={goSaveFavorite}
            accessibilityLabel="Guardar como favorito"
          />
        }
      />

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
              <Text className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-warning dark:text-warning-dark">
                Pendiente
              </Text>
            ) : null}
            <Pressable
              onPress={() => setActivityOpen(true)}
              hitSlop={8}
              className="mt-1 flex-row items-center gap-1"
            >
              <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                {formatActivityMoment(tx.created_at, 'creado')}
              </Text>
              <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
            </Pressable>
          </View>

          <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
            {isTransfer ? (
              <>
                <ListRow
                  title="De"
                  subtitle={account?.name}
                  dotColor={account?.color}
                  icon={account ? ACCOUNT_TYPE_ICON[account.type] : undefined}
                  showChevron
                  onPress={() => goAccount(tx.account_id)}
                />
                <View className="h-px bg-line dark:bg-line-dark" />
                {tx.goal ? (
                  <ListRow
                    title="A"
                    subtitle={tx.goal.name}
                    icon={tx.goal.icon as keyof typeof Ionicons.glyphMap}
                    showChevron
                    onPress={() => goGoal(tx.goal_id)}
                  />
                ) : (
                  <ListRow
                    title="A"
                    subtitle={toAccount?.name}
                    dotColor={toAccount?.color}
                    icon={toAccount ? ACCOUNT_TYPE_ICON[toAccount.type] : undefined}
                    showChevron
                    onPress={() => goAccount(tx.to_account_id)}
                  />
                )}
              </>
            ) : (
              <>
                <ListRow
                  title="Categoría"
                  subtitle={categoryLabel}
                  dotColor={tx.category?.color}
                  icon={tx.category?.icon}
                  showChevron={Boolean(tx.category)}
                  onPress={tx.category ? goCategory : undefined}
                />
                <View className="h-px bg-line dark:bg-line-dark" />
                <ListRow
                  title="Cuenta"
                  subtitle={account?.name}
                  dotColor={account?.color}
                  icon={account ? ACCOUNT_TYPE_ICON[account.type] : undefined}
                  showChevron
                  onPress={() => goAccount(tx.account_id)}
                />
              </>
            )}
          </View>

          {account && balances.accountBefore != null && balances.accountAfter != null ? (
            <BalanceCard
              title={isTransfer ? account.name : undefined}
              before={balances.accountBefore}
              after={balances.accountAfter}
              currency={account.currency}
              projected={tx.is_completed === false}
            />
          ) : null}
          {isTransfer && toAccount && balances.toAccountBefore != null && balances.toAccountAfter != null ? (
            <BalanceCard
              title={toAccount.name}
              before={balances.toAccountBefore}
              after={balances.toAccountAfter}
              currency={toAccount.currency}
              projected={tx.is_completed === false}
            />
          ) : null}

          {description ? (
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
                Descripción
              </Text>
              <Text className="text-base text-ink dark:text-ink-dark">{description}</Text>
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

      <BottomSheet visible={activityOpen} onClose={() => setActivityOpen(false)} title="Actividad">
        <View className="gap-4 px-5 pb-8 pt-1">
          <View className="gap-1">
            <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Creado</Text>
            <Text className="text-base text-ink dark:text-ink-dark">
              {formatDateTime(tx.created_at)}
            </Text>
          </View>
          {tx.updated_at !== tx.created_at ? (
            <View className="gap-1">
              <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Editado</Text>
              <Text className="text-base text-ink dark:text-ink-dark">
                {formatDateTime(tx.updated_at)}
              </Text>
            </View>
          ) : null}
        </View>
      </BottomSheet>
    </Screen>
  );
}

/**
 * "Saldo anterior → Saldo nuevo" for one account, framing this transaction's
 * effect on it. When the transaction is still pending, `after` is a
 * *projection* (what the balance would become if it settled) rather than
 * the account's real balance — labeled and dimmed differently so it never
 * reads as money that has already moved.
 */
function BalanceCard({
  title,
  before,
  after,
  currency,
  projected = false,
}: {
  /** Account name — shown only when there's more than one account in play (a transfer). */
  title?: string;
  before: number;
  after: number;
  currency: string;
  projected?: boolean;
}) {
  return (
    <View className="gap-2 rounded-2xl border border-line px-4 py-3.5 dark:border-line-dark">
      {title ? (
        <Text className="text-xs font-semibold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
          {title}
        </Text>
      ) : null}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">Saldo anterior</Text>
          <Text className="text-base font-semibold text-ink dark:text-ink-dark">
            {formatCurrency(before, currency)}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
        <View className="items-end">
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {projected ? 'Saldo si se completa' : 'Saldo nuevo'}
          </Text>
          <Text
            className={`text-base font-semibold ${
              projected ? 'text-ink-2 dark:text-ink-2-dark' : 'text-ink dark:text-ink-dark'
            }`}
          >
            {formatCurrency(after, currency)}
          </Text>
        </View>
      </View>
      {projected ? (
        <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
          Movimiento pendiente — el saldo real no cambia hasta que se complete.
        </Text>
      ) : null}
    </View>
  );
}
