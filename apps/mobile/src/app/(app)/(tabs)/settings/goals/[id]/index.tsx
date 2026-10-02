import { Ionicons } from '@expo/vector-icons';
import {
  useAccounts,
  useDeleteGoal,
  useFormError,
  useGoals,
  useTransactions,
  useUpdateGoal,
} from '@repo/core/hooks';
import {
  daysUntil,
  formatCurrency,
  formatDate,
  goalPace,
  goalProgress,
  todayISODate,
} from '@repo/core/utils';
import { Button, ConfirmSheet, ErrorCard, Fab, PageHeader, Screen, ICON_COLORS } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AddContributionSheet } from '../../../../../../features/goals/add-contribution-sheet';
import { GoalProgressBar } from '../../../../../../features/goals/goal-progress-bar';

function deadlineLabel(deadline: string | null): string {
  if (!deadline) return 'Sin fecha límite';
  const diff = daysUntil(deadline, todayISODate());
  if (diff === 0) return 'Vence hoy';
  if (diff > 0) return `Quedan ${diff} día${diff === 1 ? '' : 's'}`;
  return `Venció hace ${Math.abs(diff)} día${Math.abs(diff) === 1 ? '' : 's'}`;
}

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: goals, isLoading } = useGoals();
  const { data: transactions } = useTransactions();
  const { data: accounts } = useAccounts();
  const updateGoal = useUpdateGoal();
  const remove = useDeleteGoal();
  const { error, setError } = useFormError();
  const [contributeOpen, setContributeOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const goal = (goals ?? []).find((g) => g.id === id);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!goal) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Objetivo no encontrado.</Text>
      </Screen>
    );
  }

  const targetAmount = Number(goal.target_amount);
  const linkedAccount = goal.account_id
    ? ((accounts ?? []).find((a) => a.id === goal.account_id) ?? null)
    : null;
  const progress = goalProgress(
    goal.id,
    targetAmount,
    goal.currency,
    transactions ?? [],
    linkedAccount,
  );
  const pace =
    goal.contribution_amount != null && goal.contribution_interval_days != null
      ? goalPace(
          progress.saved,
          Number(goal.contribution_amount),
          goal.contribution_interval_days,
          goal.created_at,
        )
      : null;

  const contributions = (transactions ?? [])
    .filter((t) => (goal.account_id ? t.to_account_id === goal.account_id : t.goal_id === goal.id))
    .sort(
      (a, b) =>
        b.transaction_date.localeCompare(a.transaction_date) ||
        b.created_at.localeCompare(a.created_at),
    );

  const toggleArchive = () =>
    updateGoal.mutate({ id: goal.id, patch: { archived: !goal.archived } });
  const markCompleted = (v: boolean) =>
    updateGoal.mutate({ id: goal.id, patch: { is_completed: v } });

  const paceColor =
    pace == null
      ? undefined
      : pace.status === 'ahead'
        ? 'text-pos dark:text-pos-dark'
        : pace.status === 'behind'
          ? 'text-warning dark:text-warning-dark'
          : 'text-ink-2 dark:text-ink-2-dark';
  const paceText =
    pace == null
      ? null
      : pace.status === 'on-track'
        ? 'Vas exactamente al ritmo planeado'
        : `Vas ${formatCurrency(Math.abs(pace.difference), goal.currency)} ${pace.status === 'ahead' ? 'adelantado' : 'atrasado'} de tu ritmo planeado`;

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader title={goal.name} onBack={() => router.back()} />

      <View className="flex-1">
        <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-24">
          {goal.archived || goal.is_completed ? (
            <View className="flex-row gap-2">
              {goal.is_completed ? (
                <View className="self-start rounded-full bg-lime-tint px-3 py-1 dark:bg-lime-tint-dark">
                  <Text className="text-xs font-semibold text-lime-ink dark:text-lime-ink-dark">
                    Completada
                  </Text>
                </View>
              ) : null}
              {goal.archived ? (
                <View className="self-start rounded-full bg-line px-3 py-1 dark:bg-line-dark">
                  <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">
                    Archivado
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View className="gap-4 rounded-card bg-surface p-5 dark:bg-surface-dark">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                <Ionicons
                  name={(goal.icon as keyof typeof Ionicons.glyphMap) ?? 'flag-outline'}
                  size={20}
                  color={ICON_COLORS.limeInk}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
                  {goal.is_completed
                    ? '¡Meta completada!'
                    : progress.isComplete
                      ? '¡Monto alcanzado! Márcala como completada'
                      : deadlineLabel(goal.deadline)}{' '}
                  · {goal.currency}
                </Text>
                {goal.deadline ? (
                  <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                    Fecha límite: {formatDate(goal.deadline)}
                  </Text>
                ) : null}
                {linkedAccount ? (
                  <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                    Cuenta de ahorro: {linkedAccount.name}
                  </Text>
                ) : null}
              </View>
            </View>

            <GoalProgressBar
              saved={progress.saved}
              target={targetAmount}
              pct={progress.pct}
              isComplete={progress.isComplete}
              currency={goal.currency}
            />

            {pace ? (
              <View className="gap-0.5 border-t border-line pt-3 dark:border-line-dark">
                <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                  Ritmo planeado: {formatCurrency(Number(goal.contribution_amount), goal.currency)}{' '}
                  cada {goal.contribution_interval_days} días
                </Text>
                <Text className={`text-xs font-semibold ${paceColor}`}>{paceText}</Text>
              </View>
            ) : null}
          </View>

          {progress.isComplete && !goal.is_completed && !goal.archived ? (
            <Button
              label="Marcar como completada"
              loading={updateGoal.isPending}
              onPress={() => markCompleted(true)}
            />
          ) : null}

          {goal.is_completed && !goal.archived ? (
            <Pressable
              onPress={() => markCompleted(false)}
              className="items-center py-1"
              hitSlop={8}
            >
              <Text className="text-xs font-medium text-ink-2 dark:text-ink-2-dark">
                Marcar como no completada
              </Text>
            </Pressable>
          ) : null}

          <Button label="Agregar aportación" onPress={() => setContributeOpen(true)} />

          <View className="gap-2">
            <Text className="px-1 text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
              Aportaciones ({contributions.length})
            </Text>
            {contributions.length === 0 ? (
              <Text className="px-1 text-sm text-ink-2 dark:text-ink-2-dark">
                Sin aportaciones todavía.
              </Text>
            ) : (
              <View className="rounded-2xl border border-line dark:border-line-dark">
                {contributions.map((t, i) => (
                  <View
                    key={t.id}
                    className={`flex-row items-center gap-3 px-4 py-3.5 ${
                      i > 0 ? 'border-t border-line dark:border-line-dark' : ''
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="text-[15px] text-ink dark:text-ink-dark" numberOfLines={1}>
                        {t.account?.name ?? 'Cuenta'}
                      </Text>
                      <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                        {formatDate(t.transaction_date)}
                      </Text>
                    </View>
                    <Text className="text-[15px] font-semibold text-pos dark:text-pos-dark">
                      +{formatCurrency(t.amount, goal.currency)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className="gap-2 border-t border-line pt-5 dark:border-line-dark">
            <Button
              label={goal.archived ? 'Desarchivar' : 'Archivar objetivo'}
              variant={goal.archived ? 'secondary' : 'ghost-danger'}
              loading={updateGoal.isPending}
              onPress={() => (goal.archived ? toggleArchive() : setConfirmArchive(true))}
            />
            {goal.archived ? (
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
            accessibilityLabel="Editar objetivo"
            onPress={() =>
              router.push({ pathname: '/(app)/settings/goals/[id]/edit', params: { id: goal.id } })
            }
          />
        </View>
      </View>

      <AddContributionSheet
        visible={contributeOpen}
        onClose={() => setContributeOpen(false)}
        goalId={goal.id}
        goalName={goal.name}
        goalCurrency={goal.currency}
        goalAccountId={goal.account_id}
      />

      <ConfirmSheet
        visible={confirmArchive}
        title="¿Archivar objetivo?"
        description={
          linkedAccount && !goal.is_completed
            ? `Deja de aparecer entre tus objetivos activos. Como no está marcada como completada, se desvinculará de "${linkedAccount.name}" (esa cuenta queda libre para ligarla a otra meta). Puedes desarchivarlo cuando quieras.`
            : 'Deja de aparecer entre tus objetivos activos, pero conserva su historial de aportaciones. Puedes desarchivarlo cuando quieras.'
        }
        confirmLabel="Archivar"
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          toggleArchive();
        }}
      />

      <ConfirmSheet
        visible={confirmDelete}
        title="¿Eliminar objetivo?"
        description={
          linkedAccount
            ? `Se elimina la meta y su vínculo con "${linkedAccount.name}" — el dinero se queda intacto en esa cuenta, tenga o no aportaciones registradas. No afecta tus movimientos.`
            : 'Solo se puede eliminar si no tiene aportaciones registradas. No afecta tus movimientos.'
        }
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          remove.mutate(goal.id, {
            onSuccess: () => router.replace('/(app)/settings/goals'),
            onError: (e) => setError(e, 'No se pudo eliminar'),
          });
        }}
      />
    </Screen>
  );
}
