import { useBudgets, useTransactions } from '@repo/core/hooks';
import type { BudgetPeriodType } from '@repo/core/types';
import { budgetProgress, formatDate, toFriendlyMessage } from '@repo/core/utils';
import { ErrorCard, Fab, PageHeader, Screen, SegmentedControl } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { BudgetProgressBar } from '../../../../../features/budgets/budget-progress-bar';

const PERIOD_LABEL: Record<BudgetPeriodType, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  custom: 'Personalizado',
};

const STATUS_OPTIONS: { value: 'active' | 'archived'; label: string }[] = [
  { value: 'active', label: 'Activos' },
  { value: 'archived', label: 'Archivados' },
];

export default function BudgetsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const { data: budgets, isLoading, error } = useBudgets();
  const { data: transactions } = useTransactions();

  const visible = (budgets ?? []).filter((b) => (status === 'archived' ? b.archived : !b.archived));

  return (
    <Screen className="gap-4">
      <PageHeader title="Presupuestos" onBack={() => router.back()} />

      <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, 'No se pudieron cargar los presupuestos')} />
        </View>
      ) : visible.length === 0 ? (
        <Text className="mt-8 text-center text-sm text-ink-2 dark:text-ink-2-dark">
          {status === 'archived'
            ? 'Sin presupuestos archivados.'
            : 'Sin presupuestos todavía. Crea uno para controlar tu gasto por categoría.'}
        </Text>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 pb-24">
          {visible.map((b) => {
            const categoryIds = b.categories.map((c) => c.category.id);
            const progress = budgetProgress(
              categoryIds,
              Number(b.amount),
              b.currency,
              b,
              transactions ?? [],
            );
            const rangeLabel = `${formatDate(progress.from)} – ${formatDate(progress.to)}`;
            const periodLabel =
              b.period_type === 'custom'
                ? 'Personalizado'
                : `${PERIOD_LABEL[b.period_type]}${b.repeats ? ' · se repite' : ''}`;

            return (
              <Pressable
                key={b.id}
                onPress={() =>
                  router.push({ pathname: '/(app)/settings/budgets/[id]', params: { id: b.id } })
                }
                className="gap-3 rounded-2xl border border-line bg-surface p-4 active:opacity-70 dark:border-line-dark dark:bg-surface-dark"
                style={b.archived ? { opacity: 0.6 } : undefined}
              >
                <View>
                  <Text
                    className="text-base font-semibold text-ink dark:text-ink-dark"
                    numberOfLines={1}
                  >
                    {b.name}
                  </Text>
                  <Text className="text-xs text-ink-2 dark:text-ink-2-dark">{periodLabel}</Text>
                </View>

                <BudgetProgressBar
                  spent={progress.spent}
                  amount={Number(b.amount)}
                  pct={progress.pct}
                  isOverBudget={progress.isOverBudget}
                  currency={b.currency}
                  hasCategories={progress.hasCategories}
                />

                <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                  {b.categories.length} categoría{b.categories.length === 1 ? '' : 's'} · {rangeLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View className="absolute bottom-6 right-5">
        <Fab
          accessibilityLabel="Nuevo presupuesto"
          onPress={() => router.push('/(app)/settings/budgets/new')}
        />
      </View>
    </Screen>
  );
}
