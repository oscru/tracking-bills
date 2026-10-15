import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  buildNotifications,
  parseNotificationPrefs,
  type AppNotification,
  type NotificationInput,
  type NotificationOptions,
} from '../notifications';
import {
  dismissNotification,
  listNotificationReads,
  markNotificationsRead,
  type NotificationRead,
  type TransactionWithRefs,
} from '../supabase';
import { addDaysISO, todayISODate } from '../utils';
import { queryKeys } from './keys';
import { useAccounts } from './use-accounts';
import { useBudgets } from './use-budgets';
import { useGoals } from './use-goals';
import { useProfile } from './use-profile';
import {
  useBudgetSpendTransactions,
  useGoalTransactions,
  useReceivedPeerTransfers,
  useTransactions,
} from './use-transactions';

export function useNotificationReads() {
  return useQuery({
    queryKey: queryKeys.notificationReads.list(),
    queryFn: listNotificationReads,
  });
}

/** Writes the change straight into the cached read list, so the badge and
 * list update instantly instead of waiting for the round trip. */
function useOptimisticReads() {
  const qc = useQueryClient();
  const key = queryKeys.notificationReads.list();
  return {
    apply: async (update: (reads: NotificationRead[]) => NotificationRead[]) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<NotificationRead[]>(key);
      qc.setQueryData<NotificationRead[]>(key, update(previous ?? []));
      return { previous };
    },
    rollback: (context: { previous?: NotificationRead[] } | undefined) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    settle: () => qc.invalidateQueries({ queryKey: queryKeys.notificationReads.all }),
  };
}

export function useMarkNotificationsRead() {
  const optimistic = useOptimisticReads();
  return useMutation({
    mutationFn: markNotificationsRead,
    onMutate: (ids: string[]) =>
      optimistic.apply((reads) => {
        const known = new Set(reads.map((r) => r.notification_id));
        const now = new Date().toISOString();
        const added = ids
          .filter((id) => !known.has(id))
          .map((id) => ({ notification_id: id, read_at: now, dismissed_at: null, user_id: '' }));
        return [...reads, ...added];
      }),
    onError: (_e, _ids, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  });
}

export function useDismissNotification() {
  const optimistic = useOptimisticReads();
  return useMutation({
    mutationFn: dismissNotification,
    onMutate: (id: string) =>
      optimistic.apply((reads) => {
        const now = new Date().toISOString();
        const rest = reads.filter((r) => r.notification_id !== id);
        const existing = reads.find((r) => r.notification_id === id);
        return [
          ...rest,
          {
            notification_id: id,
            read_at: existing?.read_at ?? now,
            dismissed_at: now,
            user_id: '',
          },
        ];
      }),
    onError: (_e, _id, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  });
}

// Stable, so its query key (and cache entry, shared with Inicio) is too.
const PENDING_FILTER = { isCompleted: false } as const;

/**
 * Everything the notification rules read — but instead of the whole
 * transaction history, only the three slices they can ever look at:
 * - pending movements (the pending reminders);
 * - settled expenses in the budgets' current periods (budget alerts);
 * - settled movements counting toward goals: `goal_id`-tagged ones and
 *   everything touching a goal-linked account (goal progress/reminders).
 * Their union gives `buildNotifications` / `planScheduledNotifications`
 * exactly what the full history would: every rule filters down to one of
 * these slices, and rows outside them never match. `undefined` until loaded.
 */
export function useNotificationInput(): {
  input: NotificationInput | undefined;
  isLoading: boolean;
} {
  const { data: budgets, isLoading: loadingBudgets } = useBudgets();
  const { data: goals, isLoading: loadingGoals } = useGoals();
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: pending, isLoading: loadingPending } = useTransactions(PENDING_FILTER);
  const { data: budgetSpends, isLoading: loadingSpends } = useBudgetSpendTransactions(budgets);
  const linkedAccountIds = useMemo(
    () =>
      (goals ?? [])
        .map((g) => g.account_id)
        .filter((id): id is string => id != null)
        .sort(),
    [goals],
  );
  const { data: goalTx, isLoading: loadingGoalTx } = useGoalTransactions(linkedAccountIds, {
    enabled: goals != null,
  });

  // Transfers linked people sent in the last week ("Ana te envió…").
  const { data: received } = useReceivedPeerTransfers(addDaysISO(todayISODate(), -7));

  const input = useMemo<NotificationInput | undefined>(() => {
    if (!budgets || !goals || !accounts || !pending || !budgetSpends || !goalTx) return undefined;
    const byId = new Map<string, TransactionWithRefs>();
    for (const list of [pending, budgetSpends, goalTx]) for (const t of list) byId.set(t.id, t);
    return { transactions: [...byId.values()], received: received ?? [], budgets, goals, accounts };
  }, [budgets, goals, accounts, pending, budgetSpends, goalTx, received]);

  return {
    input,
    isLoading:
      loadingBudgets ||
      loadingGoals ||
      loadingAccounts ||
      loadingPending ||
      loadingSpends ||
      loadingGoalTx,
  };
}

export interface NotificationItem extends AppNotification {
  read: boolean;
}

/**
 * The in-app notification list: every notification the rules derive from
 * the user's data (`buildNotifications`), minus dismissed ones, each flagged
 * read/unread. Built entirely from queries the app already has cached.
 */
export function useNotifications(options: Omit<NotificationOptions, 'today'> = {}) {
  const { input, isLoading } = useNotificationInput();
  // If read state can't load (e.g. offline), everything just shows as unread.
  const { data: reads } = useNotificationReads();
  const { data: profile } = useProfile();
  const today = todayISODate();
  // The user's own budget threshold (Opciones › Notificaciones) unless the caller overrides it.
  const budgetThreshold =
    options.budgetThreshold ?? parseNotificationPrefs(profile?.notification_prefs).budgetThreshold;
  const { overdueRepeatDays } = options;

  const items = useMemo<NotificationItem[]>(() => {
    if (!input) return [];
    const state = new Map((reads ?? []).map((r) => [r.notification_id, r]));
    return buildNotifications(input, { today, budgetThreshold, overdueRepeatDays })
      .filter((n) => !state.get(n.id)?.dismissed_at)
      .map((n) => ({ ...n, read: state.has(n.id) }));
  }, [input, reads, today, budgetThreshold, overdueRepeatDays]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  return {
    items,
    unreadCount,
    isLoading,
  };
}
