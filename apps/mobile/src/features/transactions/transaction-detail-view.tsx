import { Ionicons } from '@expo/vector-icons';
import {
  useAccounts,
  useCategories,
  useStableRecord,
  useTransaction,
  useAccountNetBefore,
  useUpdateTransaction,
} from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import {
  accountBalance,
  formatActivityMoment,
  formatCurrency,
  formatDate,
  formatDateTime,
  projectedAccountBalance,
} from '@repo/core/utils';
import {
  BottomSheet,
  Button,
  Chip,
  IconButton,
  ListRow,
  PageHeader,
  Screen,
  ICON_COLORS,
  useTabBarScrollPadding,
} from '@repo/ui';
import { useRouter } from 'expo-router';
import { ArrowRight, Heart, Info, Pencil } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AccountPicker } from '../accounts/account-picker';
import { ACCOUNT_TYPE_ICON } from '../accounts/account-types';
import { useTabBarAction } from '../navigation/floating-tab-bar';
import { MarkDoneSheet } from './mark-done-sheet';
import { TransactionDetailSkeleton } from './transaction-detail-skeleton';

/** Full screen on its own route, or a pane beside the list (desktop Movimientos). */
function Shell({
  embedded,
  center,
  children,
}: {
  embedded: boolean;
  center?: boolean;
  children: ReactNode;
}) {
  if (!embedded) {
    return (
      <Screen edges={['top']} center={center} className="gap-5">
        {children}
      </Screen>
    );
  }
  return (
    <View className={`flex-1 gap-5 px-6 pt-6 ${center ? 'items-center justify-center' : ''}`}>
      {children}
    </View>
  );
}

/**
 * A transaction's detail. `embedded` renders it as a side pane (desktop
 * Movimientos' master-detail): no screen chrome, a close button instead of
 * "back", and its own edit button instead of taking over the sidebar's
 * primary action.
 */
export function TransactionDetailView({
  id,
  embedded = false,
  onClose,
}: {
  id: string;
  embedded?: boolean;
  onClose?: () => void;
}) {
  const { t } = useTranslation(['transactions', 'common']);
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const goBack = onClose ?? (() => router.back());
  const { data: rawTx, isLoading } = useTransaction(id);
  const tx = useStableRecord(rawTx);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  // Unfiltered — needed to reconstruct each account's balance as of this
  // transaction, not just its current one.
  const [activityOpen, setActivityOpen] = useState(false);
  const [markDoneOpen, setMarkDoneOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const updateTransaction = useUpdateTransaction();

  const account = (accounts ?? []).find((a) => a.id === tx?.account_id) ?? null;
  const toAccount = (accounts ?? []).find((a) => a.id === tx?.to_account_id) ?? null;
  const parentCategory = (categories ?? []).find((c) => c.id === tx?.category?.parent_id) ?? null;

  // Each account's balance right before this transaction, and right after.
  // A settled transaction gets its actual historical before/after, in ledger
  // order (by date, then creation time on the same day). A still-pending one
  // hasn't happened yet, so it isn't "placed" in that order at all — its
  // "before" is just the account's current real balance right now, and
  // "after" is that plus its own effect (`projectedAccountBalance`), so the
  // projection always tracks today's real money instead of a snapshot frozen
  // at whatever date the pending movement happens to be filed under.
  // Postgres sums each account's settled movements up to that point
  // (`account_net_before`) — no need for the whole history here.
  const point = tx?.is_completed === false ? null : (tx?.transaction_date ?? null);
  const pointCreatedAt = point ? (tx?.created_at ?? null) : null;
  const { data: accountNet } = useAccountNetBefore(account?.id, point, pointCreatedAt);
  const { data: toAccountNet } = useAccountNetBefore(toAccount?.id, point, pointCreatedAt);
  const balances = useMemo(() => {
    // The balance at that point, as an account with no movements after it —
    // so `projectedAccountBalance` just adds this movement's own effect.
    const at = (a: NonNullable<typeof account>, net: number | undefined) =>
      net == null
        ? null
        : { ...a, initial_balance: Math.round((Number(a.initial_balance) + net) * 100) / 100 };
    const from = account ? at(account, accountNet) : null;
    const to = toAccount ? at(toAccount, toAccountNet) : null;
    return {
      accountBefore: from ? accountBalance(from, []) : null,
      accountAfter: from && tx ? projectedAccountBalance(from, [], tx) : null,
      toAccountBefore: to ? accountBalance(to, []) : null,
      toAccountAfter: to && tx ? projectedAccountBalance(to, [], tx) : null,
    };
  }, [tx, account, toAccount, accountNet, toAccountNet]);

  // A transfer someone linked sent you: they own its amount, date and
  // status, so there's nothing to edit here but where it landed (below).
  const editable = Boolean(tx && !tx.is_peer_mirror);
  const goEdit = () =>
    tx && router.push({ pathname: '/(app)/transactions/[id]/edit', params: { id: tx.id } });
  useTabBarAction(
    !embedded && tx && !tx.is_peer_mirror
      ? {
          icon: Pencil,
          accessibilityLabel: t('detail.edit'),
          onPress: () =>
            router.push({ pathname: '/(app)/transactions/[id]/edit', params: { id: tx.id } }),
        }
      : null,
  );

  if (isLoading) {
    return (
      <Shell embedded={embedded}>
        <PageHeader title={t('detail.title')} onBack={goBack} />
        <TransactionDetailSkeleton />
      </Shell>
    );
  }
  if (!tx) {
    return (
      <Shell embedded={embedded} center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">{t('notFound')}</Text>
      </Shell>
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
    : t('row.noCategory');
  const description = tx.description?.trim();
  // Transfers between linked people (see peer transfers): the "account" on
  // the other side is a contact account standing for that person.
  const fromPerson = tx.account?.type === 'contact' ? tx.account : null;
  const toPerson = tx.to_account?.type === 'contact' ? tx.to_account : null;
  const title = isTransfer
    ? fromPerson
      ? t('row.receivedFrom', { name: fromPerson.name })
      : toPerson
        ? t('row.sentTo', { name: toPerson.name })
        : t('row.transfer')
    : description || categoryLabel;
  const goPeople = () => router.push('/(app)/settings/peers');

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
    <Shell embedded={embedded}>
      <PageHeader
        title={title}
        onBack={goBack}
        action={
          <View className="flex-row gap-2">
            {embedded && editable ? (
              <IconButton icon={Pencil} onPress={goEdit} accessibilityLabel={t('detail.edit')} />
            ) : null}
            <IconButton
              icon={Heart}
              onPress={goSaveFavorite}
              accessibilityLabel={t('detail.saveFavorite')}
            />
          </View>
        }
      />

      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollPadding }}
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
                {t('common:pending')}
              </Text>
            ) : null}
            <Pressable
              onPress={() => setActivityOpen(true)}
              hitSlop={8}
              className="mt-1 flex-row items-center gap-1"
            >
              <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                {formatActivityMoment(tx.created_at, 'created')}
              </Text>
              <Info size={14} color={ICON_COLORS.ink3} />
            </Pressable>
          </View>

          {tx.is_peer_mirror ? (
            <Text className="px-1 text-xs text-ink-2 dark:text-ink-2-dark">
              {tx.is_completed === false
                ? t('detail.mirrorPending', {
                    name: fromPerson?.name ?? t('detail.thatPerson'),
                    date: formatDate(tx.transaction_date),
                  })
                : t('detail.mirrorDone', { name: fromPerson?.name ?? t('detail.thatPerson') })}{' '}
              {t('detail.mirrorLocked')}
            </Text>
          ) : tx.is_completed === false ? (
            <Button label={t('markDone.title')} onPress={() => setMarkDoneOpen(true)} />
          ) : null}

          <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
            {isTransfer ? (
              <>
                {fromPerson ? (
                  <ListRow
                    title={t('detail.from')}
                    subtitle={fromPerson.name}
                    icon={ACCOUNT_TYPE_ICON.contact}
                    showChevron
                    onPress={goPeople}
                  />
                ) : (
                  <ListRow
                    title={t('detail.from')}
                    subtitle={account?.name}
                    dotColor={account?.color}
                    icon={account ? ACCOUNT_TYPE_ICON[account.type] : undefined}
                    showChevron
                    onPress={() => goAccount(tx.account_id)}
                  />
                )}
                <View className="h-px bg-line dark:bg-line-dark" />
                {tx.goal ? (
                  <ListRow
                    title={t('detail.to')}
                    subtitle={tx.goal.name}
                    icon={tx.goal.icon as keyof typeof Ionicons.glyphMap}
                    showChevron
                    onPress={() => goGoal(tx.goal_id)}
                  />
                ) : toPerson ? (
                  <ListRow
                    title={t('detail.to')}
                    subtitle={toPerson.name}
                    icon={ACCOUNT_TYPE_ICON.contact}
                    showChevron
                    onPress={goPeople}
                  />
                ) : (
                  <ListRow
                    title={tx.is_peer_mirror ? t('detail.landedIn') : t('detail.to')}
                    subtitle={toAccount?.name}
                    dotColor={toAccount?.color}
                    icon={toAccount ? ACCOUNT_TYPE_ICON[toAccount.type] : undefined}
                    showChevron
                    // A received transfer can be moved to another of your
                    // accounts — the only thing about it you can change.
                    onPress={
                      tx.is_peer_mirror
                        ? () => setMoveOpen(true)
                        : () => goAccount(tx.to_account_id)
                    }
                  />
                )}
              </>
            ) : (
              <>
                <ListRow
                  title={t('detail.category')}
                  subtitle={categoryLabel}
                  dotColor={tx.category?.color}
                  icon={tx.category?.icon}
                  showChevron={Boolean(tx.category)}
                  onPress={tx.category ? goCategory : undefined}
                />
                <View className="h-px bg-line dark:bg-line-dark" />
                <ListRow
                  title={t('detail.account')}
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
          {isTransfer &&
          toAccount &&
          balances.toAccountBefore != null &&
          balances.toAccountAfter != null ? (
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
                {t('detail.description')}
              </Text>
              <Text className="text-base text-ink dark:text-ink-dark">{description}</Text>
            </View>
          ) : null}

          {tx.tags.length > 0 ? (
            <View className="gap-2">
              <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
                {t('detail.tags')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {tx.tags.map((tag) => (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    dotColor={tag.color}
                    selected
                    onPress={() => goTag(tag.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {tx.is_peer_mirror ? (
        <AccountPicker
          visible={moveOpen}
          onClose={() => setMoveOpen(false)}
          title={t('detail.whichAccount')}
          selectedId={tx.to_account_id}
          currencyFilter={currency}
          onSelect={(accountId) =>
            updateTransaction.mutate({ id: tx.id, patch: { to_account_id: accountId } })
          }
        />
      ) : null}

      <MarkDoneSheet
        visible={markDoneOpen}
        onClose={() => setMarkDoneOpen(false)}
        transactionId={tx.id}
        type={tx.type}
      />

      <BottomSheet
        visible={activityOpen}
        onClose={() => setActivityOpen(false)}
        title={t('detail.activity')}
      >
        <View className="gap-4 px-5 pb-8 pt-1">
          <View className="gap-1">
            <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
              {t('detail.created')}
            </Text>
            <Text className="text-base text-ink dark:text-ink-dark">
              {formatDateTime(tx.created_at)}
            </Text>
          </View>
          {tx.updated_at !== tx.created_at ? (
            <View className="gap-1">
              <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
                {t('detail.edited')}
              </Text>
              <Text className="text-base text-ink dark:text-ink-dark">
                {formatDateTime(tx.updated_at)}
              </Text>
            </View>
          ) : null}
        </View>
      </BottomSheet>
    </Shell>
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
  const { t } = useTranslation('transactions');
  return (
    <View className="gap-2 rounded-2xl border border-line px-4 py-3.5 dark:border-line-dark">
      {title ? (
        <Text className="text-xs font-semibold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
          {title}
        </Text>
      ) : null}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {t('detail.balanceBefore')}
          </Text>
          <Text className="text-base font-semibold text-ink dark:text-ink-dark">
            {formatCurrency(before, currency)}
          </Text>
        </View>
        <ArrowRight size={16} color={ICON_COLORS.ink3} />
        <View className="items-end">
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {t(projected ? 'detail.balanceIfDone' : 'detail.balanceAfter')}
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
        <Text className="text-xs text-ink-3 dark:text-ink-3-dark">{t('detail.pendingNote')}</Text>
      ) : null}
    </View>
  );
}
