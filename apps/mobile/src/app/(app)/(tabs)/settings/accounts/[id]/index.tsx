import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useGoals, useTransactions, useUpdateAccount } from '@repo/core/hooks';
import { accountBalance, formatCurrency, toFriendlyMessage } from '@repo/core/utils';
import {
  Button,
  ConfirmSheet,
  ErrorCard,
  Fab,
  PageHeader,
  Screen,
  SwitchRow,
  ICON_COLORS,
} from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AccountDetailSkeleton } from '../../../../../../features/accounts/account-detail-skeleton';
import { AdjustBalanceSheet } from '../../../../../../features/accounts/adjust-balance-sheet';
import { ACCOUNT_TYPE_LABEL } from '../../../../../../features/accounts/account-types';

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: transactions, isLoading: loadingTx } = useTransactions();
  const { data: goals } = useGoals();
  const updateAccount = useUpdateAccount();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiveBlockedMessage, setArchiveBlockedMessage] = useState<string | null>(null);

  const account = (accounts ?? []).find((a) => a.id === id);
  const linkedGoal = (goals ?? []).find((g) => g.account_id === id) ?? null;

  const { balance, incomeCount, expenseCount } = useMemo(() => {
    if (!account) return { balance: 0, incomeCount: 0, expenseCount: 0 };
    const all = transactions ?? [];
    let income = 0;
    let expense = 0;
    for (const t of all) {
      if (t.account_id !== account.id) continue;
      if (t.type === 'income') income++;
      else if (t.type === 'expense') expense++;
    }
    return { balance: accountBalance(account, all), incomeCount: income, expenseCount: expense };
  }, [account, transactions]);

  const openMovements = (type: 'income' | 'expense') =>
    router.push({
      pathname: '/(app)/transactions',
      params: { type, accountId: id },
    });

  if (loadingAccounts || loadingTx) {
    return (
      <Screen edges={['top']} className="gap-5">
        <PageHeader title="Cuenta" onBack={() => router.back()} />
        <AccountDetailSkeleton />
      </Screen>
    );
  }
  if (!account) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Cuenta no encontrada.</Text>
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
        onError: (e) =>
          setArchiveBlockedMessage(toFriendlyMessage(e, 'No se pudo archivar la cuenta')),
      },
    );
  };

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader title={account.name} onBack={() => router.back()} />

      <View className="flex-1">
        <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-24">
          <View className="rounded-card bg-surface p-5 dark:bg-surface-dark">
            <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
              {ACCOUNT_TYPE_LABEL[account.type]}
              {account.archived ? ' · archivada' : ''}
            </Text>
            <Text className="mt-1 text-4xl font-bold tracking-tight text-ink dark:text-ink-dark">
              {formatCurrency(balance, account.currency)}
            </Text>
          </View>

          <Button label="Ajustar saldo" onPress={() => setAdjustOpen(true)} />

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => openMovements('income')}
              className="flex-1 rounded-2xl border border-pos/30 bg-lime-tint p-4 active:opacity-70 dark:border-pos-dark/30 dark:bg-lime-tint-dark"
            >
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="arrow-down-circle" size={16} color={ICON_COLORS.pos} />
                <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">
                  Ingresos
                </Text>
              </View>
              <Text className="mt-1 text-2xl font-bold text-pos dark:text-pos-dark">
                {incomeCount}
              </Text>
              <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
                {incomeCount === 1 ? 'movimiento' : 'movimientos'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openMovements('expense')}
              className="flex-1 rounded-2xl border border-line bg-[#F1F2F4] p-4 active:opacity-70 dark:border-line-dark dark:bg-line-dark"
            >
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="arrow-up-circle" size={16} color={ICON_COLORS.ink} />
                <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">
                  Gastos
                </Text>
              </View>
              <Text className="mt-1 text-2xl font-bold text-ink dark:text-ink-dark">
                {expenseCount}
              </Text>
              <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
                {expenseCount === 1 ? 'movimiento' : 'movimientos'}
              </Text>
            </Pressable>
          </View>

          <SwitchRow
            label="Mostrar en Inicio"
            description="Aparece en la lista de cuentas de la pantalla principal"
            value={account.show_on_home}
            onValueChange={(v) =>
              updateAccount.mutate({ id: account.id, patch: { show_on_home: v } })
            }
          />

          <SwitchRow
            label="Incluir en balance total"
            description="Se suma al «Balance total» de la pantalla principal"
            value={account.include_in_total}
            onValueChange={(v) =>
              updateAccount.mutate({ id: account.id, patch: { include_in_total: v } })
            }
          />

          <View className="gap-3 border-t border-line pt-5 dark:border-line-dark">
            <Button
              label={account.archived ? 'Desarchivar' : 'Archivar'}
              variant={account.archived ? 'secondary' : 'ghost-danger'}
              loading={updateAccount.isPending}
              onPress={() => {
                if (account.archived) return toggleArchive();
                // A balance left in an archived account is real money that's
                // easy to forget about — archiving only hides it from
                // pickers (see `accountBalance`, which ignores `archived`),
                // it doesn't zero it out. Require settling it first.
                if (Math.round(balance * 100) !== 0) {
                  setArchiveBlockedMessage(
                    'No puedes archivar una cuenta con saldo distinto de cero. Transfiere el saldo a otra cuenta o ajústalo a 0 primero.',
                  );
                  return;
                }
                setArchiveBlockedMessage(null);
                setConfirmArchive(true);
              }}
            />
            <ErrorCard message={archiveBlockedMessage} />
          </View>
        </ScrollView>

        <View className="absolute bottom-6 right-5">
          <Fab
            icon="pencil"
            accessibilityLabel="Editar cuenta"
            onPress={() =>
              router.push({
                pathname: '/(app)/settings/accounts/[id]/edit',
                params: { id: account.id },
              })
            }
          />
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
        title="¿Archivar cuenta?"
        description={
          linkedGoal
            ? `Dejará de aparecer para elegirla en movimientos nuevos, pero conserva todo su historial. Como está vinculada a la meta "${linkedGoal.name}", esa meta se desvinculará y volverá a llevar su progreso de forma manual. Puedes desarchivar la cuenta y volver a vincularla cuando quieras.`
            : 'Dejará de aparecer para elegirla en movimientos nuevos, pero conserva todo su historial. Puedes desarchivarla cuando quieras.'
        }
        confirmLabel="Archivar"
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          toggleArchive();
        }}
      />
    </Screen>
  );
}
