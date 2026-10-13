import {
  useAccounts,
  useBudgets,
  useGoals,
  useMarkNotificationsRead,
  useNotificationReads,
  useProfile,
  useSession,
  useTransactions,
} from '@repo/core/hooks';
import { parseNotificationPrefs } from '@repo/core/notifications';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';

import {
  clearDeviceNotifications,
  DEVICE_NOTIFICATIONS_SUPPORTED,
  subscribeToNotificationTaps,
  syncDeviceNotifications,
  useNotificationPermission,
} from './device';
import { notificationTargetHref, parseNotificationTarget } from './target-href';

// Coalesces bursts (several queries settling at once after launch, a save
// that invalidates three lists) into a single sync.
const SYNC_DEBOUNCE_MS = 800;
// See the tap handler below.
const NAVIGATE_DELAY_MS = 350;

/**
 * Mounted once inside the signed-in app (like `ThemeSync`): keeps the
 * device's scheduled notifications in step with the data, and opens the
 * right screen when one is tapped. Renders nothing.
 */
export function NotificationSync() {
  return DEVICE_NOTIFICATIONS_SUPPORTED ? <NativeNotificationSync /> : null;
}

function NativeNotificationSync() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const { data: profile } = useProfile();
  const { data: transactions } = useTransactions();
  const { data: budgets } = useBudgets();
  const { data: goals } = useGoals();
  const { data: accounts } = useAccounts();
  const { data: reads, isSuccess: readsLoaded, isError: readsFailed } = useNotificationReads();
  const permission = useNotificationPermission();
  const markRead = useMarkNotificationsRead();

  const prefs = useMemo(
    () => parseNotificationPrefs(profile?.notification_prefs),
    [profile?.notification_prefs],
  );
  const readIds = useMemo(() => new Set((reads ?? []).map((r) => r.notification_id)), [reads]);

  // --- keep the device in sync -----------------------------------------------
  const running = useRef<Promise<void> | null>(null);
  useEffect(() => {
    if (!userId || !profile || !transactions || !budgets || !goals || !accounts) return;
    // Wait for read state (or its failure) so already-read items aren't re-sent.
    if (!readsLoaded && !readsFailed) return;
    if (permission.state === 'undetermined') return;

    const timer = setTimeout(() => {
      const run = async () => {
        await running.current?.catch(() => {});
        await syncDeviceNotifications({
          input: { transactions, budgets, goals, accounts },
          prefs,
          permitted: permission.state === 'granted',
          readIds,
          userId,
        });
      };
      running.current = run().catch(() => {});
    }, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    userId,
    profile,
    transactions,
    budgets,
    goals,
    accounts,
    readsLoaded,
    readsFailed,
    readIds,
    prefs,
    permission.state,
  ]);

  // Signing out unmounts this — don't leave this account's reminders behind.
  useEffect(() => () => void clearDeviceNotifications().catch(() => {}), []);

  // --- open what was tapped -----------------------------------------------------
  const markReadRef = useRef(markRead.mutate);
  useEffect(() => {
    markReadRef.current = markRead.mutate;
  });

  useEffect(
    () =>
      subscribeToNotificationTaps((data) => {
        if (typeof data.notificationId === 'string') markReadRef.current([data.notificationId]);
        const target = parseNotificationTarget(data);
        const href = target
          ? notificationTargetHref(target)
          : data.open === 'center'
            ? '/(app)/notifications'
            : null;
        if (!href) return;
        // A tap that launches the app from closed arrives while the
        // navigators are still mounting — a push right then is dropped.
        // Waiting a beat lets the stack be ready to receive it.
        setTimeout(() => router.push(href), NAVIGATE_DELAY_MS);
      }),
    [router],
  );

  return null;
}
