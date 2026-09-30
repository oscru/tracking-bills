import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useGoals, useProfile, useTransactions } from '@repo/core/hooks';
import { daysUntil, formatDate, goalProgress, todayISODate, toFriendlyMessage } from '@repo/core/utils';
import { ErrorCard, Fab, PageHeader, Screen, SegmentedControl } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { GoalProgressBar } from '../../../../../features/goals/goal-progress-bar';

const STATUS_OPTIONS: { value: 'active' | 'archived'; label: string }[] = [
  { value: 'active', label: 'Activos' },
  { value: 'archived', label: 'Archivados' },
];

function deadlineLabel(deadline: string | null): string {
  if (!deadline) return 'Sin fecha límite';
  const diff = daysUntil(deadline, todayISODate());
  if (diff === 0) return 'Vence hoy';
  if (diff > 0) return `Quedan ${diff} día${diff === 1 ? '' : 's'} · ${formatDate(deadline)}`;
  return `Venció hace ${Math.abs(diff)} día${Math.abs(diff) === 1 ? '' : 's'} · ${formatDate(deadline)}`;
}

export default function GoalsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const { data: accounts } = useAccounts();
  const { data: profile } = useProfile();
  const { data: goals, isLoading, error } = useGoals();
  const { data: transactions } = useTransactions();
  const currency = profile?.currency ?? accounts?.[0]?.currency ?? 'MXN';

  const visible = (goals ?? []).filter((g) => (status === 'archived' ? g.archived : !g.archived));

  return (
    <Screen className="gap-4">
      <PageHeader title="Objetivos" onBack={() => router.back()} />

      <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, 'No se pudieron cargar los objetivos')} />
        </View>
      ) : visible.length === 0 ? (
        <Text className="mt-8 text-center text-sm text-ink-2 dark:text-ink-2-dark">
          {status === 'archived'
            ? 'Sin objetivos archivados.'
            : 'Sin objetivos todavía. Crea uno para empezar a ahorrar para una meta.'}
        </Text>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 pb-24">
          {visible.map((g) => {
            const progress = goalProgress(g.id, Number(g.target_amount), transactions ?? []);
            return (
              <Pressable
                key={g.id}
                onPress={() =>
                  router.push({ pathname: '/(app)/settings/goals/[id]', params: { id: g.id } })
                }
                className="gap-3 rounded-2xl border border-line bg-surface p-4 active:opacity-70 dark:border-line-dark dark:bg-surface-dark"
                style={g.archived ? { opacity: 0.6 } : undefined}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                    <Ionicons
                      name={(g.icon as keyof typeof Ionicons.glyphMap) ?? 'flag-outline'}
                      size={16}
                      color="#4D7C0F"
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-base font-semibold text-ink dark:text-ink-dark"
                      numberOfLines={1}
                    >
                      {g.name}
                    </Text>
                    <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                      {progress.isComplete ? '¡Meta alcanzada!' : deadlineLabel(g.deadline)}
                    </Text>
                  </View>
                </View>
                <GoalProgressBar
                  saved={progress.saved}
                  target={Number(g.target_amount)}
                  pct={progress.pct}
                  isComplete={progress.isComplete}
                  currency={currency}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View className="absolute bottom-6 right-5">
        <Fab accessibilityLabel="Nuevo objetivo" onPress={() => router.push('/(app)/settings/goals/new')} />
      </View>
    </Screen>
  );
}
