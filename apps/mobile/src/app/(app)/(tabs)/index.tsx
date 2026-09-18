import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useTransactions } from '@repo/core/hooks';
import {
  accountBalance,
  formatCurrency,
  monthTotals,
  todayISODate,
  totalBalance,
} from '@repo/core/utils';
import { Fab, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ACCOUNT_TYPE_ICON } from '../../../features/accounts/account-types';
import { MonthPickerSheet } from '../../../features/home/month-picker-sheet';

export default function HomeScreen() {
  const router = useRouter();
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: transactions, isLoading: loadingTx } = useTransactions();
  const [hidden, setHidden] = useState(false);

  const active = useMemo(() => (accounts ?? []).filter((a) => !a.archived), [accounts]);
  const visibleAccounts = useMemo(() => active.filter((a) => a.show_on_home), [active]);
  const currency = active[0]?.currency ?? 'MXN';
  const balance = useMemo(() => totalBalance(active, transactions ?? []), [active, transactions]);
  const loading = loadingAccounts || loadingTx;

  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(now.getMonth());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const monthDate = useMemo(
    () => new Date(selectedYear, selectedMonthIdx, 1),
    [selectedYear, selectedMonthIdx],
  );
  const selectedMonth = `${selectedYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`;
  const monthLabel = monthDate.toLocaleDateString('es-MX', { month: 'long' });
  const yearLabel = String(selectedYear);
  const monthStart = `${selectedMonth}-01`;
  const monthEnd = todayISODate(new Date(selectedYear, selectedMonthIdx + 1, 0));
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonthIdx === now.getMonth();

  const shiftMonth = (delta: number) => {
    const next = new Date(selectedYear, selectedMonthIdx + delta, 1);
    setSelectedYear(next.getFullYear());
    setSelectedMonthIdx(next.getMonth());
  };

  const month = useMemo(
    () => monthTotals(transactions ?? [], selectedMonth),
    [transactions, selectedMonth],
  );

  const openMonth = (type: 'income' | 'expense') =>
    router.push({
      pathname: '/(app)/transactions',
      params: { type, from: monthStart, to: monthEnd },
    });
  const openAccount = (accountId: string) =>
    router.push({ pathname: '/(app)/settings/accounts/[id]', params: { id: accountId } });

  return (
    <Screen className="gap-5">
      <View className="flex-row items-center justify-center gap-4 pt-2">
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} accessibilityLabel="Mes anterior">
          <Ionicons name="chevron-back" size={22} color="#9CA3AF" />
        </Pressable>
        <Pressable
          onPress={() => setMonthPickerOpen(true)}
          hitSlop={8}
          className="min-w-[100px] items-center active:opacity-60"
        >
          <Text className="text-xs font-medium text-ink-3 dark:text-ink-3-dark">{yearLabel}</Text>
          <Text className="text-base font-bold capitalize text-ink dark:text-ink-dark">
            {monthLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => shiftMonth(1)}
          hitSlop={10}
          disabled={isCurrentMonth}
          accessibilityLabel="Mes siguiente"
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={isCurrentMonth ? '#D1D5DB' : '#9CA3AF'}
          />
        </Pressable>
      </View>

      <MonthPickerSheet
        visible={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        year={selectedYear}
        month={selectedMonthIdx}
        onSelect={(y, m) => {
          setSelectedYear(y);
          setSelectedMonthIdx(m);
        }}
      />

      {loading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 pb-24"
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-card bg-surface p-5 dark:bg-surface-dark">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
                Balance total
              </Text>
              <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
                <Ionicons
                  name={hidden ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </Pressable>
            </View>
            <Text className="mt-1 text-4xl font-bold tracking-tight text-ink dark:text-ink-dark">
              {hidden ? '• • • •' : formatCurrency(balance, currency)}
            </Text>
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => openMonth('income')}
              className="flex-1 rounded-2xl bg-surface p-4 active:opacity-70 dark:bg-surface-dark"
            >
              <Text className="text-xs capitalize text-ink-2 dark:text-ink-2-dark">Ingresos</Text>
              <Text className="mt-1 text-xl font-bold text-pos dark:text-pos-dark">
                {hidden ? '•••' : formatCurrency(month.income, currency)}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openMonth('expense')}
              className="flex-1 rounded-2xl bg-surface p-4 active:opacity-70 dark:bg-surface-dark"
            >
              <Text className="text-xs capitalize text-ink-2 dark:text-ink-2-dark">Gastos</Text>
              <Text className="mt-1 text-xl font-bold text-ink dark:text-ink-dark">
                {hidden ? '•••' : formatCurrency(month.expense, currency)}
              </Text>
            </Pressable>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
              Tus cuentas
            </Text>
            <View className="rounded-card border border-line dark:border-line-dark">
              {visibleAccounts.map((a, i) => (
                <Pressable
                  key={a.id}
                  onPress={() => openAccount(a.id)}
                  className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-60 ${
                    i > 0 ? 'border-t border-line dark:border-line-dark' : ''
                  }`}
                >
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-full ${
                      a.color ? '' : 'bg-lime-tint dark:bg-lime-tint-dark'
                    }`}
                    style={a.color ? { backgroundColor: `${a.color}26` } : undefined}
                  >
                    <Ionicons
                      name={ACCOUNT_TYPE_ICON[a.type]}
                      size={16}
                      color={a.color ?? '#4D7C0F'}
                    />
                  </View>
                  <Text className="flex-1 text-[15px] font-medium text-ink dark:text-ink-dark">
                    {a.name}
                  </Text>
                  <Text className="text-[15px] font-semibold text-ink dark:text-ink-dark">
                    {hidden
                      ? '•••'
                      : formatCurrency(accountBalance(a, transactions ?? []), a.currency)}
                  </Text>
                </Pressable>
              ))}
              {visibleAccounts.length === 0 ? (
                <Text className="px-4 py-4 text-sm text-ink-2 dark:text-ink-2-dark">
                  {active.length === 0
                    ? 'Aún no tienes cuentas.'
                    : 'No tienes cuentas visibles aquí — actívalas desde Cuenta › Mostrar en inicio.'}
                </Text>
              ) : null}
            </View>
          </View>

          <Text className="text-sm text-ink-3 dark:text-ink-3-dark">
            Gráficas por categoría y tendencia mensual — próximamente.
          </Text>
        </ScrollView>
      )}

      <View className="absolute bottom-6 right-5">
        <Fab
          accessibilityLabel="Nuevo movimiento"
          onPress={() => router.push('/(app)/new-transaction')}
        />
      </View>
    </Screen>
  );
}
