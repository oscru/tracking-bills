import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useTransactions, useUpdateAccount } from '@repo/core/hooks';
import { accountBalance, formatCurrency } from '@repo/core/utils';
import { Button, Screen, SwitchRow } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AdjustBalanceSheet } from '../../../../../../features/accounts/adjust-balance-sheet';
import { ACCOUNT_TYPE_LABEL } from '../../../../../../features/accounts/account-types';

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: transactions, isLoading: loadingTx } = useTransactions();
  const updateAccount = useUpdateAccount();
  const [adjustOpen, setAdjustOpen] = useState(false);

  const account = (accounts ?? []).find((a) => a.id === id);

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
      <Screen center>
        <ActivityIndicator />
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

  return (
    <Screen className="gap-5">
      <View className="flex-row items-center justify-between pt-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="flex-row items-center gap-1"
        >
          <Ionicons name="chevron-back" size={20} color="#1A1D21" />
          <Text className="text-lg font-bold text-ink dark:text-ink-dark">{account.name}</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(app)/settings/accounts/[id]/edit',
              params: { id: account.id },
            })
          }
          hitSlop={8}
        >
          <Text className="text-sm font-semibold text-lime-ink dark:text-lime-ink-dark">
            Editar
          </Text>
        </Pressable>
      </View>

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
            <Ionicons name="arrow-down-circle" size={16} color="#16A34A" />
            <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">Ingresos</Text>
          </View>
          <Text className="mt-1 text-2xl font-bold text-pos dark:text-pos-dark">{incomeCount}</Text>
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {incomeCount === 1 ? 'movimiento' : 'movimientos'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => openMovements('expense')}
          className="flex-1 rounded-2xl border border-line bg-[#F1F2F4] p-4 active:opacity-70 dark:border-line-dark dark:bg-line-dark"
        >
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="arrow-up-circle" size={16} color="#1A1D21" />
            <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">Gastos</Text>
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
        onValueChange={(v) => updateAccount.mutate({ id: account.id, patch: { show_on_home: v } })}
      />

      <AdjustBalanceSheet
        visible={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        accountId={account.id}
        currency={account.currency}
        currentBalance={balance}
      />
    </Screen>
  );
}
