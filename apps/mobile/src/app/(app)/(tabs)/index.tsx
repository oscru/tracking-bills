import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useSession, useTransactions } from '@repo/core/hooks';
import type { AccountType } from '@repo/core/types';
import {
  accountBalance,
  formatCurrency,
  monthTotals,
  todayISODate,
  totalBalance,
} from '@repo/core/utils';
import { Avatar, Fab, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

const ACCOUNT_ICON: Record<AccountType, keyof typeof Ionicons.glyphMap> = {
  cash: 'cash-outline',
  bank: 'business-outline',
  credit_card: 'card-outline',
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: transactions, isLoading: loadingTx } = useTransactions();
  const [hidden, setHidden] = useState(false);

  const active = useMemo(() => (accounts ?? []).filter((a) => !a.archived), [accounts]);
  const visibleAccounts = useMemo(() => active.filter((a) => a.show_on_home), [active]);
  const currency = active[0]?.currency ?? 'MXN';
  const balance = useMemo(() => totalBalance(active, transactions ?? []), [active, transactions]);
  const thisMonth = todayISODate().slice(0, 7);
  const month = useMemo(
    () => monthTotals(transactions ?? [], thisMonth),
    [transactions, thisMonth],
  );
  const monthLabel = new Date().toLocaleDateString('es-MX', { month: 'long' });
  const loading = loadingAccounts || loadingTx;

  const monthEnd = todayISODate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  const openMonth = (type: 'income' | 'expense') =>
    router.push({
      pathname: '/(app)/transactions',
      params: { type, from: `${thisMonth}-01`, to: monthEnd },
    });
  const openAccount = (accountId: string) =>
    router.push({ pathname: '/(app)/settings/accounts/[id]', params: { id: accountId } });

  return (
    <Screen className="gap-5">
      <View className="flex-row items-center justify-between pt-2">
        <View>
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">Hola</Text>
          <Text className="text-lg font-bold text-ink dark:text-ink-dark">
            {user?.email?.split('@')[0] ?? 'Bienvenido'}
          </Text>
        </View>
        <Avatar name={user?.email} />
      </View>

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
              <Text className="text-xs capitalize text-ink-2 dark:text-ink-2-dark">
                Ingresos · {monthLabel}
              </Text>
              <Text className="mt-1 text-xl font-bold text-pos dark:text-pos-dark">
                {hidden ? '•••' : formatCurrency(month.income, currency)}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openMonth('expense')}
              className="flex-1 rounded-2xl bg-surface p-4 active:opacity-70 dark:bg-surface-dark"
            >
              <Text className="text-xs capitalize text-ink-2 dark:text-ink-2-dark">
                Gastos · {monthLabel}
              </Text>
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
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                    <Ionicons name={ACCOUNT_ICON[a.type]} size={16} color="#4D7C0F" />
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
          onPress={() => router.push('/(app)/transactions/new')}
        />
      </View>
    </Screen>
  );
}
