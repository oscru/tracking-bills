import {
  useAccounts,
  useBudgets,
  useDeleteBudget,
  useFormError,
  useTransactions,
  useUpdateBudget,
} from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { BudgetPeriodType } from '@repo/core/types';
import { budgetProgress, formatDate } from '@repo/core/utils';
import { Button, CategoryDot, ConfirmSheet, ErrorCard, Fab, PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { BudgetProgressBar } from '../../../../../../features/budgets/budget-progress-bar';

const PERIOD_LABEL: Record<BudgetPeriodType, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  custom: 'Personalizado',
};

export default function BudgetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const { data: budgets, isLoading } = useBudgets();
  const { data: transactions } = useTransactions();
  const updateBudget = useUpdateBudget();
  const remove = useDeleteBudget();
  const { error, setError } = useFormError();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currency = accounts?.[0]?.currency ?? 'MXN';

  const budget = (budgets ?? []).find((b) => b.id === id);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!budget) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Presupuesto no encontrado.</Text>
      </Screen>
    );
  }

  const categoryIds = budget.categories.map((c) => c.category.id);
  const progress = budgetProgress(categoryIds, Number(budget.amount), budget, transactions ?? []);

  const rangeLabel = `${formatDate(progress.from)} – ${formatDate(progress.to)}`;
  const periodLabel =
    budget.period_type === 'custom'
      ? rangeLabel
      : `${PERIOD_LABEL[budget.period_type]}${budget.repeats ? ' · se repite' : ''} · ${rangeLabel}`;

  const toggleArchive = () => updateBudget.mutate({ id: budget.id, patch: { archived: !budget.archived } });

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader title={budget.name} onBack={() => router.back()} />

      <View className="flex-1 gap-5">
        <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-24">
          {budget.archived ? (
            <View className="self-start rounded-full bg-line px-3 py-1 dark:bg-line-dark">
              <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">Archivado</Text>
            </View>
          ) : null}

          <View className="gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark">
            <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">{periodLabel}</Text>
            <BudgetProgressBar
              spent={progress.spent}
              amount={Number(budget.amount)}
              pct={progress.pct}
              isOverBudget={progress.isOverBudget}
              currency={currency}
            />
          </View>

          <View className="gap-2">
            <Text className="px-1 text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
              Categorías ({budget.categories.length})
            </Text>
            <View className="gap-3 rounded-2xl border border-line p-4 dark:border-line-dark">
              {budget.categories.map(({ category: c, amount: allocated }, i) => {
                const catProgress = budgetProgress([c.id], allocated, budget, transactions ?? []);
                return (
                  <View
                    key={c.id}
                    className={i > 0 ? 'gap-2 border-t border-line pt-3 dark:border-line-dark' : 'gap-2'}
                  >
                    <View className="flex-row items-center gap-2">
                      <CategoryDot color={c.color} icon={c.icon} size={14} />
                      <Text className="flex-1 text-sm text-ink dark:text-ink-dark" numberOfLines={1}>
                        {resolveCategoryLabel(c)}
                      </Text>
                    </View>
                    <BudgetProgressBar
                      spent={catProgress.spent}
                      amount={allocated}
                      pct={catProgress.pct}
                      isOverBudget={catProgress.isOverBudget}
                      currency={currency}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          <View className="gap-2 border-t border-line pt-5 dark:border-line-dark">
            <Button
              label={budget.archived ? 'Desarchivar' : 'Archivar presupuesto'}
              variant={budget.archived ? 'secondary' : 'ghost-danger'}
              loading={updateBudget.isPending}
              onPress={() => (budget.archived ? toggleArchive() : setConfirmArchive(true))}
            />
            {budget.archived ? (
              <Pressable onPress={() => setConfirmDelete(true)} className="items-center py-2">
                <Text className="text-sm font-medium text-danger dark:text-danger-dark">
                  Eliminar definitivamente
                </Text>
              </Pressable>
            ) : null}
          </View>

          <ErrorCard message={error} />
        </ScrollView>

        <View className="absolute bottom-6 right-5">
          <Fab
            icon="pencil"
            accessibilityLabel="Editar presupuesto"
            onPress={() =>
              router.push({
                pathname: '/(app)/settings/budgets/[id]/edit',
                params: { id: budget.id },
              })
            }
          />
        </View>
      </View>

      <ConfirmSheet
        visible={confirmArchive}
        title="¿Archivar presupuesto?"
        description="Deja de aparecer en Inicio y Análisis, pero conserva su historial. Puedes desarchivarlo cuando quieras."
        confirmLabel="Archivar"
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          toggleArchive();
        }}
      />

      <ConfirmSheet
        visible={confirmDelete}
        title="¿Eliminar presupuesto?"
        description="Se elimina el presupuesto y su relación con sus categorías, sin poder deshacerlo. No afecta los movimientos ya registrados."
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          remove.mutate(budget.id, {
            onSuccess: () => router.replace('/(app)/settings/budgets'),
            onError: (e) => setError(e, 'No se pudo eliminar'),
          });
        }}
      />
    </Screen>
  );
}
