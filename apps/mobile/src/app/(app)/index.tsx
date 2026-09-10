import { useAccounts, useTransactions } from '@repo/core/hooks';
import { formatCurrency, signedAmount, todayISODate } from '@repo/core/utils';
import { Fab, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: transactions, isLoading: loadingTx } = useTransactions();

  const active = useMemo(() => (accounts ?? []).filter((a) => !a.archived), [accounts]);
  const currency = active[0]?.currency ?? 'MXN';

  const balance = useMemo(() => {
    const initial = active.reduce((sum, a) => sum + Number(a.initial_balance), 0);
    const flow = (transactions ?? []).reduce(
      (sum, t) => sum + signedAmount(t.type, Number(t.amount)),
      0,
    );
    return initial + flow;
  }, [active, transactions]);

  const month = useMemo(() => {
    const ym = todayISODate().slice(0, 7);
    let income = 0;
    let expense = 0;
    for (const t of transactions ?? []) {
      if (!t.transaction_date.startsWith(ym)) continue;
      if (t.type === 'income') income += Number(t.amount);
      else expense += Number(t.amount);
    }
    return { income, expense };
  }, [transactions]);

  const monthLabel = new Date().toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });
  const loading = loadingAccounts || loadingTx;

  return (
    <Screen className="gap-6">
      <Text className="pt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-50">Inicio</Text>

      {loading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <>
          <View className="gap-1">
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">Balance total</Text>
            <Text className="text-4xl font-bold text-neutral-900 dark:text-neutral-50">
              {formatCurrency(balance, currency)}
            </Text>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                Ingresos · {monthLabel}
              </Text>
              <Text className="mt-1 text-xl font-semibold text-green-600 dark:text-green-500">
                {formatCurrency(month.income, currency)}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                Gastos · {monthLabel}
              </Text>
              <Text className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                {formatCurrency(month.expense, currency)}
              </Text>
            </View>
          </View>

          <Text className="text-sm text-neutral-400 dark:text-neutral-500">
            Gráficas por categoría y tendencia mensual — Fase 7.
          </Text>
        </>
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
