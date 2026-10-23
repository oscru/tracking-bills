import { i18n } from '@repo/core/i18n';
import { Ionicons } from '@expo/vector-icons';
import {
  useAccounts,
  useDeleteGoal,
  useFormError,
  useGoals,
  useStableRecord,
  useGoalTransactions,
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
import {
  Button,
  ConfirmSheet,
  ErrorCard,
  PageHeader,
  Screen,
  ICON_COLORS,
  useTabBarScrollPadding,
  HeroCard,
  useIsDesktop,
} from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AddContributionSheet } from '../../../../../../features/goals/add-contribution-sheet';
import { GoalProgressBar } from '../../../../../../features/goals/goal-progress-bar';
import { SplitColumns } from '../../../../../../features/design/split-columns';
import { useTabBarAction } from '../../../../../../features/navigation/floating-tab-bar';

function deadlineLabel(deadline: string | null): string {
  if (!deadline) return i18n.t('goals:deadline.none');
  const diff = daysUntil(deadline, todayISODate());
  if (diff === 0) return i18n.t('goals:deadline.today');
  if (diff > 0) return i18n.t('goals:deadline.left', { count: diff });
  return i18n.t('goals:deadline.overdue', { count: Math.abs(diff) });
}

export default function GoalDetail() {
  const { t } = useTranslation(['goals', 'common']);
  const scrollPadding = useTabBarScrollPadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const desktop = useIsDesktop();
  const { data: goals, isLoading } = useGoals();
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
  const updateGoal = useUpdateGoal();
  const remove = useDeleteGoal();
  const { error, setError } = useFormError();
  const [contributeOpen, setContributeOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const goal = useStableRecord((goals ?? []).find((g) => g.id === id));

  useTabBarAction(
    goal
      ? {
          icon: Pencil,
          accessibilityLabel: t('edit'),
          onPress: () =>
            router.push({ pathname: '/(app)/settings/goals/[id]/edit', params: { id: goal.id } }),
        }
      : null,
  );

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
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">{t('notFound')}</Text>
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

  // Readable on the always-dark hero card the pace line sits on.
  const paceColor =
    pace == null
      ? undefined
      : pace.status === 'ahead'
        ? 'text-pos-dark'
        : pace.status === 'behind'
          ? 'text-warning-dark'
          : 'text-white/70';
  const paceText =
    pace == null
      ? null
      : pace.status === 'on-track'
        ? t('paceOnTrack')
        : t(pace.status === 'ahead' ? 'paceAhead' : 'paceBehind', {
            amount: formatCurrency(Math.abs(pace.difference), goal.currency),
          });

  return (
    <Screen edges={['top']} className="gap-5" width={desktop ? 'wide' : undefined}>
      <PageHeader title={goal.name} onBack={() => router.back()} />

      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5"
          contentContainerStyle={{ paddingBottom: scrollPadding }}
        >
          <SplitColumns
            left={
              <>
                {goal.archived || goal.is_completed ? (
                  <View className="flex-row gap-2">
                    {goal.is_completed ? (
                      <View className="self-start rounded-full bg-lime-tint px-3 py-1 dark:bg-lime-tint-dark">
                        <Text className="text-xs font-semibold text-lime-ink dark:text-lime-ink-dark">
                          {t('completed')}
                        </Text>
                      </View>
                    ) : null}
                    {goal.archived ? (
                      <View className="self-start rounded-full bg-line px-3 py-1 dark:bg-line-dark">
                        <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">
                          {t('archivedBadge')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Saved vs. target — the screen's headline, on the hero surface. */}
                <HeroCard contentStyle={{ gap: 16 }}>
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-lime/15">
                      <Ionicons
                        name={(goal.icon as keyof typeof Ionicons.glyphMap) ?? 'flag-outline'}
                        size={20}
                        color={ICON_COLORS.lime}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-white">
                        {goal.is_completed
                          ? t('goalDone')
                          : progress.isComplete
                            ? t('reachedMark')
                            : deadlineLabel(goal.deadline)}{' '}
                        · {goal.currency}
                      </Text>
                      {goal.deadline ? (
                        <Text className="text-xs text-white/55">
                          {t('deadlineOn', { date: formatDate(goal.deadline) })}
                        </Text>
                      ) : null}
                      {linkedAccount ? (
                        <Text className="text-xs text-white/55">
                          {t('savingsAccountIs', { name: linkedAccount.name })}
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
                    tone="onDark"
                  />

                  {pace ? (
                    <View className="gap-0.5 border-t border-white/10 pt-3">
                      <Text className="text-xs text-white/55">
                        {t('planned', {
                          amount: formatCurrency(Number(goal.contribution_amount), goal.currency),
                          days: goal.contribution_interval_days,
                        })}
                      </Text>
                      <Text className={`text-xs font-semibold ${paceColor}`}>{paceText}</Text>
                    </View>
                  ) : null}
                </HeroCard>

                {progress.isComplete && !goal.is_completed && !goal.archived ? (
                  <Button
                    label={t('markDone')}
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
                      {t('markNotDone')}
                    </Text>
                  </Pressable>
                ) : null}

                <Button label={t('addContribution')} onPress={() => setContributeOpen(true)} />
              </>
            }
            right={
              <>
                <View className="gap-2">
                  <Text className="px-1 text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
                    {t('contributions', { count: contributions.length })}
                  </Text>
                  {contributions.length === 0 ? (
                    <Text className="px-1 text-sm text-ink-2 dark:text-ink-2-dark">
                      {t('noContributions')}
                    </Text>
                  ) : (
                    <View className="rounded-2xl border border-line dark:border-line-dark">
                      {contributions.map((tx, i) => (
                        <View
                          key={tx.id}
                          className={`flex-row items-center gap-3 px-4 py-3.5 ${
                            i > 0 ? 'border-t border-line dark:border-line-dark' : ''
                          }`}
                        >
                          <View className="flex-1">
                            <Text
                              className="text-[15px] text-ink dark:text-ink-dark"
                              numberOfLines={1}
                            >
                              {tx.account?.name ?? t('account')}
                            </Text>
                            <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                              {formatDate(tx.transaction_date)}
                            </Text>
                          </View>
                          <Text className="text-[15px] font-semibold text-pos dark:text-pos-dark">
                            +{formatCurrency(tx.amount, goal.currency)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View className="gap-2 border-t border-line pt-5 dark:border-line-dark">
                  <Button
                    label={goal.archived ? t('common:unarchive') : t('archive')}
                    variant={goal.archived ? 'secondary' : 'ghost-danger'}
                    loading={updateGoal.isPending}
                    onPress={() => (goal.archived ? toggleArchive() : setConfirmArchive(true))}
                  />
                  {goal.archived ? (
                    <Pressable onPress={() => setConfirmDelete(true)} className="items-center py-2">
                      <Text className="text-sm font-medium text-danger dark:text-danger-dark">
                        {t('deleteForever')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <ErrorCard message={error} />
              </>
            }
          />
        </ScrollView>
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
        title={t('archiveTitle')}
        description={
          linkedAccount && !goal.is_completed
            ? t('archiveBodyLinked', { account: linkedAccount.name })
            : t('archiveBody')
        }
        confirmLabel={t('common:archive')}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          toggleArchive();
        }}
      />

      <ConfirmSheet
        visible={confirmDelete}
        title={t('deleteTitle')}
        description={
          linkedAccount ? t('deleteBodyLinked', { account: linkedAccount.name }) : t('deleteBody')
        }
        confirmLabel={t('common:delete')}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          remove.mutate(goal.id, {
            onSuccess: () => router.replace('/(app)/settings/goals'),
            onError: (e) => setError(e, t('common:deleteFailed')),
          });
        }}
      />
    </Screen>
  );
}
