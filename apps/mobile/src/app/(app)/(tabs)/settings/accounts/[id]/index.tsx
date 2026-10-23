import {
  useAccounts,
  useGoals,
  useStableRecord,
  useAccountBalanceEffects,
  useAccountTransactionCounts,
  useUpdateAccount,
} from '@repo/core/hooks';
import {
  balancesFromEffects,
  formatCurrency,
  formatDateTime,
  toFriendlyMessage,
} from '@repo/core/utils';
import {
  Button,
  ConfirmSheet,
  ErrorCard,
  PageHeader,
  Screen,
  SwitchRow,
  ICON_COLORS,
  useFloatingTabBarInset,
  HeroCard,
  useIsDesktop,
} from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleArrowDown, CircleArrowUp, Pencil } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AccountDetailSkeleton } from '../../../../../../features/accounts/account-detail-skeleton';
import { AdjustBalanceSheet } from '../../../../../../features/accounts/adjust-balance-sheet';
import { AccountIcon } from '../../../../../../features/accounts/account-icon';
import { accountTypeLabel } from '../../../../../../features/accounts/account-types';
import { RecordInfoButton } from '../../../../../../features/design/record-info';
import { SplitColumns } from '../../../../../../features/design/split-columns';
import { useTabBarAction } from '../../../../../../features/navigation/floating-tab-bar';

export default function AccountDetail() {
  const { t } = useTranslation(['accounts', 'common']);
  const tabBarInset = useFloatingTabBarInset();
  const desktop = useIsDesktop();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  // The balance and the movement counts come from Postgres (the balance
  // view and two COUNTs) — not the whole transaction history. The movements
  // themselves open in Movimientos, filtered by this account and paged.
  const { data: balanceEffects, isLoading: loadingBalance } = useAccountBalanceEffects();
  const { data: counts, isLoading: loadingCounts } = useAccountTransactionCounts(id);
  const { data: goals } = useGoals();
  const updateAccount = useUpdateAccount();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiveBlockedMessage, setArchiveBlockedMessage] = useState<string | null>(null);

  const account = useStableRecord((accounts ?? []).find((a) => a.id === id));
  const linkedGoal = (goals ?? []).find((g) => g.account_id === id) ?? null;

  const balance = useMemo(
    () =>
      account ? (balancesFromEffects([account], balanceEffects ?? []).get(account.id) ?? 0) : 0,
    [account, balanceEffects],
  );
  const incomeCount = counts?.income ?? 0;
  const expenseCount = counts?.expense ?? 0;

  const openMovements = (type: 'income' | 'expense') =>
    router.push({
      pathname: '/(app)/transactions',
      params: { type, accountId: id },
    });

  useTabBarAction(
    account
      ? {
          icon: Pencil,
          accessibilityLabel: t('edit'),
          onPress: () =>
            router.push({
              pathname: '/(app)/settings/accounts/[id]/edit',
              params: { id: account.id },
            }),
        }
      : null,
  );

  if (loadingAccounts || loadingBalance || loadingCounts) {
    return (
      <Screen edges={['top']} className="gap-5" width={desktop ? 'wide' : undefined}>
        <PageHeader title={t('account')} onBack={() => router.back()} />
        <AccountDetailSkeleton />
      </Screen>
    );
  }
  if (!account) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">{t('notFound')}</Text>
      </Screen>
    );
  }

  const toggleArchive = () => {
    // Archiving unlinks any goal pointed at this account atomically, in the
    // same DB transaction (`accounts_unlink_goal_on_archive` trigger) — no
    // separate client-side call needed, so there's no window where the
    // account ends up archived but still linked if a second request failed.
    updateAccount.mutate(
      { id: account.id, patch: { archived: !account.archived } },
      {
        onSuccess: () => setArchiveBlockedMessage(null),
        // Defense in depth: the UI already blocks this before opening the
        // confirm sheet, but a concurrent edit from another device could
        // still make the DB-level check (`check_account_archive_zero_balance`)
        // the one that actually catches it.
        onError: (e) => setArchiveBlockedMessage(toFriendlyMessage(e, t('archiveFailed'))),
      },
    );
  };

  return (
    <Screen edges={['top']} className="gap-5" width={desktop ? 'wide' : undefined}>
      <PageHeader
        title={account.name}
        onBack={() => router.back()}
        action={
          <RecordInfoButton
            title={t('info.title')}
            rows={[
              { label: t('info.type'), value: accountTypeLabel(account.type) },
              { label: t('info.currency'), value: account.currency },
              {
                label: t('info.initialBalance'),
                value: formatCurrency(Number(account.initial_balance), account.currency),
              },
              { label: t('info.transactions'), value: String(incomeCount + expenseCount) },
              { label: t('common:info.created'), value: formatDateTime(account.created_at) },
              { label: t('common:info.updated'), value: formatDateTime(account.updated_at) },
              {
                label: t('common:info.archived'),
                value: account.archived_at ? formatDateTime(account.archived_at) : '',
              },
            ]}
          />
        }
      />

      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5"
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          <SplitColumns
            left={
              <>
                {/* The account's balance is this screen's headline — glowing in the
          account's own color, so each account feels like itself. */}
                <HeroCard tint={account.color}>
                  <View className="flex-row items-center gap-3">
                    <AccountIcon account={account} size={42} />
                    <View>
                      <Text className="text-[13px] text-white/60">
                        {accountTypeLabel(account.type)} · {account.currency}
                        {account.archived ? t('archivedSuffix') : ''}
                      </Text>
                      <Text className="text-sm font-semibold text-white">
                        {t('currentBalance')}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-4 text-4xl font-extrabold tracking-tight text-white">
                    {formatCurrency(balance, account.currency)}
                  </Text>
                </HeroCard>

                {/* Secondary on purpose: the navbar's lime "editar" is this screen's action. */}
                <Button
                  label={t('adjustBalance')}
                  variant="secondary"
                  onPress={() => setAdjustOpen(true)}
                />
              </>
            }
            right={
              <>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => openMovements('income')}
                    className="flex-1 rounded-2xl border border-pos/30 bg-lime-tint p-4 active:opacity-70 dark:border-pos-dark/30 dark:bg-lime-tint-dark"
                  >
                    <View className="flex-row items-center gap-1.5">
                      <CircleArrowDown size={16} color={ICON_COLORS.pos} />
                      <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">
                        {t('common:income')}
                      </Text>
                    </View>
                    <Text className="mt-1 text-2xl font-bold text-pos dark:text-pos-dark">
                      {incomeCount}
                    </Text>
                    <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
                      {t('movements', { count: incomeCount })}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openMovements('expense')}
                    className="flex-1 rounded-2xl border border-line bg-[#F1F2F4] p-4 active:opacity-70 dark:border-line-dark dark:bg-line-dark"
                  >
                    <View className="flex-row items-center gap-1.5">
                      <CircleArrowUp
                        size={16}
                        color={dark ? ICON_COLORS.inkDark : ICON_COLORS.ink}
                      />
                      <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">
                        {t('common:expenses')}
                      </Text>
                    </View>
                    <Text className="mt-1 text-2xl font-bold text-ink dark:text-ink-dark">
                      {expenseCount}
                    </Text>
                    <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
                      {t('movements', { count: expenseCount })}
                    </Text>
                  </Pressable>
                </View>

                <SwitchRow
                  label={t('showOnHome')}
                  description={t('showOnHomeHint')}
                  value={account.show_on_home}
                  onValueChange={(v) =>
                    updateAccount.mutate({ id: account.id, patch: { show_on_home: v } })
                  }
                />

                <SwitchRow
                  label={t('includeInTotal')}
                  description={t('includeInTotalHint')}
                  value={account.include_in_total}
                  onValueChange={(v) =>
                    updateAccount.mutate({ id: account.id, patch: { include_in_total: v } })
                  }
                />
              </>
            }
          />
        </ScrollView>
        {/* Pinned to the bottom, clear of the floating tab bar — not the last
        thing in the scroll, where it floated mid-screen on a short page. */}
        <View
          className="gap-3 border-t border-line pt-3 dark:border-line-dark"
          style={{ paddingBottom: tabBarInset + 4 }}
        >
          <Button
            label={t(account.archived ? 'common:unarchive' : 'common:archive')}
            variant={account.archived ? 'secondary' : 'ghost-danger'}
            loading={updateAccount.isPending}
            onPress={() => {
              if (account.archived) return toggleArchive();
              // A balance left in an archived account is real money that's
              // easy to forget about — archiving only hides it from
              // pickers (see `accountBalance`, which ignores `archived`),
              // it doesn't zero it out. Require settling it first.
              if (Math.round(balance * 100) !== 0) {
                setArchiveBlockedMessage(t('archiveNonZero'));
                return;
              }
              setArchiveBlockedMessage(null);
              setConfirmArchive(true);
            }}
          />
          <ErrorCard message={archiveBlockedMessage} />
        </View>
      </View>

      <AdjustBalanceSheet
        visible={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        accountId={account.id}
        currency={account.currency}
        currentBalance={balance}
      />

      <ConfirmSheet
        visible={confirmArchive}
        title={t('archiveTitle')}
        description={
          linkedGoal ? t('archiveBodyGoal', { goal: linkedGoal.name }) : t('archiveBody')
        }
        confirmLabel={t('common:archive')}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          toggleArchive();
        }}
      />
    </Screen>
  );
}
