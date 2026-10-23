import { i18n } from '@repo/core/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useGoals, useGoalTransactions } from '@repo/core/hooks';
import {
  daysUntil,
  formatDate,
  goalProgress,
  todayISODate,
  toFriendlyMessage,
} from '@repo/core/utils';
import {
  EmptyState,
  ErrorCard,
  GoalsEmptyIllustration,
  PageHeader,
  Screen,
  SegmentedControl,
  StaggerItem,
  ICON_COLORS,
  useTabBarScrollPadding,
} from '@repo/ui';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { GoalProgressBar } from '../../../../../features/goals/goal-progress-bar';
import { useTabBarAction } from '../../../../../features/navigation/floating-tab-bar';

const STATUS_OPTIONS: { value: 'active' | 'archived'; label: string }[] = [
  { value: 'active', label: 'active' },
  { value: 'archived', label: 'archived' },
];

function deadlineLabel(deadline: string | null): string {
  if (!deadline) return i18n.t('goals:deadline.none');
  const diff = daysUntil(deadline, todayISODate());
  if (diff === 0) return i18n.t('goals:deadline.today');
  if (diff > 0)
    return `${i18n.t('goals:deadline.left', { count: diff })} · ${formatDate(deadline)}`;
  return `${i18n.t('goals:deadline.overdue', { count: Math.abs(diff) })} · ${formatDate(deadline)}`;
}

export default function GoalsScreen() {
  const { t } = useTranslation('goals');
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const { data: goals, isLoading, error } = useGoals();
  // Only the movements involving goals (tagged to one, or touching a
  // goal-linked account) — not the whole history. Same query as the goal
  // notifications, so it's usually cached already.
  const linkedAccountIds = useMemo(
    () =>
      (goals ?? [])
        .map((g) => g.account_id)
        .filter((accountId): accountId is string => accountId != null)
        .sort(),
    [goals],
  );
  const { data: transactions } = useGoalTransactions(linkedAccountIds, {
    enabled: goals != null,
  });
  const { data: accounts } = useAccounts();

  const visible = (goals ?? []).filter((g) => (status === 'archived' ? g.archived : !g.archived));

  useTabBarAction({
    icon: Plus,
    accessibilityLabel: t('new'),
    onPress: () => router.push('/(app)/settings/goals/new'),
  });

  return (
    <Screen edges={['top']} className="gap-4">
      <PageHeader title={t('title')} onBack={() => router.back()} />

      <SegmentedControl
        options={STATUS_OPTIONS.map((o) => ({ ...o, label: t(`tabs.${o.value}`) }))}
        value={status}
        onChange={setStatus}
      />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, t('loadFailed'))} />
        </View>
      ) : visible.length === 0 ? (
        <EmptyState
          illustration={<GoalsEmptyIllustration />}
          title={t(status === 'archived' ? 'emptyArchived' : 'empty')}
          description={status === 'archived' ? undefined : t('emptyHint')}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3"
          contentContainerStyle={{ paddingBottom: scrollPadding }}
        >
          {visible.map((g, i) => {
            const linkedAccount = g.account_id
              ? ((accounts ?? []).find((a) => a.id === g.account_id) ?? null)
              : null;
            const progress = goalProgress(
              g.id,
              Number(g.target_amount),
              g.currency,
              transactions ?? [],
              linkedAccount,
            );
            return (
              <StaggerItem key={g.id} index={i}>
                <Pressable
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
                        color={ICON_COLORS.limeInk}
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
                        {g.is_completed
                          ? t('completed')
                          : progress.isComplete
                            ? t('reached')
                            : deadlineLabel(g.deadline)}
                      </Text>
                    </View>
                  </View>
                  <GoalProgressBar
                    saved={progress.saved}
                    target={Number(g.target_amount)}
                    pct={progress.pct}
                    isComplete={progress.isComplete}
                    currency={g.currency}
                  />
                </Pressable>
              </StaggerItem>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
