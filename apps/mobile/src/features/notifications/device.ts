import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TransactionWithRefs, BudgetWithCategories } from '@repo/core/supabase';
import type { Account, Goal } from '@repo/core/types';
import {
  buildNotifications,
  eventNotifications,
  planScheduledNotifications,
  type AppNotification,
  type NotificationPrefs,
} from '@repo/core/notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * Everything that talks to the OS notification APIs — the only file that
 * touches `expo-notifications`. Everywhere it can't run, every function here
 * is a no-op:
 * - web has no local notifications;
 * - Expo Go on Android dropped `expo-notifications` in SDK 53 — there even
 *   *importing* it throws, which takes down every module that imports it (and
 *   the routes built on them). It's loaded lazily below for that reason, never
 *   with a top-level `import`. Development and store builds work normally.
 */
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Expo Go on Android: works once the app runs as a development build. */
export const DEVICE_NOTIFICATIONS_NEED_DEV_BUILD = Platform.OS === 'android' && IS_EXPO_GO;

export const DEVICE_NOTIFICATIONS_SUPPORTED =
  Platform.OS === 'ios' || (Platform.OS === 'android' && !IS_EXPO_GO);

const Notifications: typeof NotificationsModule | null = DEVICE_NOTIFICATIONS_SUPPORTED
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- must not load where it throws (see above)
    (require('expo-notifications') as typeof NotificationsModule)
  : null;

const ANDROID_CHANNEL_ID = 'reminders';

if (Notifications) {
  // Also show them while the app is open (an over-budget alert fires right
  // as you save the expense) — quietly: no sound, no app-icon badge.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let channelReady: Promise<unknown> | null = null;
function ensureAndroidChannel() {
  if (!Notifications || Platform.OS !== 'android') return Promise.resolve();
  channelReady ??= Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Recordatorios y avisos',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  return channelReady;
}

export type PermissionState = 'granted' | 'undetermined' | 'denied' | 'unsupported';

export interface NotificationPermission {
  state: PermissionState;
  /** False once the user said no and the OS won't show the prompt again — only Settings can fix it. */
  canAskAgain: boolean;
  request: () => Promise<PermissionState>;
}

async function readPermission(): Promise<{ state: PermissionState; canAskAgain: boolean }> {
  if (!Notifications) return { state: 'unsupported', canAskAgain: false };
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  const state: PermissionState =
    status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  return { state, canAskAgain };
}

/**
 * The OS permission, re-read whenever the app comes back to the foreground
 * (the user may have flipped it in Settings meanwhile).
 */
export function useNotificationPermission(): NotificationPermission {
  const [value, setValue] = useState<{ state: PermissionState; canAskAgain: boolean }>({
    state: DEVICE_NOTIFICATIONS_SUPPORTED ? 'undetermined' : 'unsupported',
    canAskAgain: DEVICE_NOTIFICATIONS_SUPPORTED,
  });

  useEffect(() => {
    if (!DEVICE_NOTIFICATIONS_SUPPORTED) return;
    let alive = true;
    const refresh = () => {
      readPermission()
        .then((next) => alive && setValue(next))
        .catch(() => {});
    };
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const request = useCallback(async () => {
    if (!Notifications) return 'unsupported' as const;
    await Notifications.requestPermissionsAsync();
    const next = await readPermission();
    setValue(next);
    return next.state;
  }, []);

  return { ...value, request };
}

// Flat string values only: a nested object in `data` doesn't reliably make
// the round trip through Android's native bundle and back to JS — the tap
// arrived without a usable target, so it opened nothing.
function content(n: AppNotification): NotificationsModule.NotificationContentInput {
  return {
    title: n.title,
    body: n.body,
    data: { notificationId: n.id, targetType: n.target.type, targetId: n.target.id },
  };
}

// Bumped whenever `content`'s payload shape changes: scheduled notifications
// are only rescheduled when their identifier changes, so this makes the next
// sync replace any already-scheduled ones carrying the old payload.
const SCHEDULE_VERSION = 'v2';

export interface DeviceSyncInput {
  transactions: TransactionWithRefs[];
  budgets: BudgetWithCategories[];
  goals: Goal[];
  accounts: Account[];
}

/**
 * Brings the device in line with the current data:
 * - date-based notifications (pending payments, goal contributions) are
 *   (re)scheduled for the next weeks, and any that no longer apply (paid,
 *   read, turned off) are cancelled;
 * - event-based ones (budget crossed, goal milestone) that are new since the
 *   last sync are shown right away.
 *
 * Idempotent — safe to run on every data change. Scheduled notifications
 * are keyed `<version>|<notification id>@<fire time>`, so unchanged ones are left alone.
 */
export async function syncDeviceNotifications({
  input,
  prefs,
  permitted,
  readIds,
  userId,
}: {
  input: DeviceSyncInput;
  prefs: NotificationPrefs;
  permitted: boolean;
  readIds: ReadonlySet<string>;
  userId: string;
}): Promise<void> {
  if (!Notifications) return;

  if (!permitted || !prefs.enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  await ensureAndroidChannel();

  // 1. Date-based: diff desired vs. already scheduled.
  const plan = planScheduledNotifications(input, prefs, { excludeIds: readIds });
  const desired = new Map(
    plan.map((n) => [`${SCHEDULE_VERSION}|${n.id}@${n.fireAt.getTime()}`, n]),
  );
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIds = new Set(scheduled.map((s) => s.identifier));

  await Promise.all(
    scheduled
      .filter((s) => !desired.has(s.identifier))
      .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
  );
  for (const [identifier, n] of desired) {
    if (scheduledIds.has(identifier)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: content(n),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: n.fireAt,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }

  // 2. Event-based: announce only what's new since the last sync.
  const current = buildNotifications(input, { budgetThreshold: prefs.budgetThreshold });
  const events = eventNotifications(current, prefs).filter((n) => !readIds.has(n.id));
  const storageKey = `notifications:alerted:${userId}`;
  const stored = await AsyncStorage.getItem(storageKey);

  // Kept to ids that still apply, so the list can't grow forever.
  const stillCurrent = new Set(current.map((n) => n.id));
  let alerted: Set<string>;
  if (stored == null) {
    // First sync on this device: whatever is already true isn't news —
    // don't flood the user with every past milestone on install.
    alerted = new Set(events.map((n) => n.id));
  } else {
    alerted = new Set((JSON.parse(stored) as string[]).filter((id) => stillCurrent.has(id)));
    for (const n of events) {
      if (alerted.has(n.id)) continue;
      await Notifications.scheduleNotificationAsync({
        content: content(n),
        trigger: Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null,
      });
      alerted.add(n.id);
    }
  }
  await AsyncStorage.setItem(storageKey, JSON.stringify([...alerted]));
}

/** Drops everything scheduled — on sign-out, so another account never gets this one's reminders. */
export async function clearDeviceNotifications(): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** A one-off notification right now — the "Enviar prueba" button, to check permissions and banners. */
export async function sendTestNotification(): Promise<void> {
  if (!Notifications) return;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Así se verán tus avisos',
      body: 'Te avisaremos de pagos pendientes, presupuestos y tus metas de ahorro.',
      // Tapping it opens the notification center — so it also tests taps.
      data: { open: 'center' },
    },
    trigger: Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null,
  });
}

/** What a tapped notification carries (see `content`) — raw, validated by the caller. */
export type TappedNotification = Record<string, unknown>;

/**
 * Calls `onTap` with the payload of every notification the user taps —
 * including the one that launched the app from closed, which fired before
 * anything subscribed. Returns the unsubscribe function.
 */
export function subscribeToNotificationTaps(onTap: (data: TappedNotification) => void): () => void {
  if (!Notifications) return () => {};
  const N = Notifications;
  const handle = (response: NotificationsModule.NotificationResponse) => {
    const data = (response.notification.request.content.data ?? {}) as TappedNotification;
    if (__DEV__) console.log('[notifications] tapped', JSON.stringify(data));
    onTap(data);
    // So a later remount (sign out → in) doesn't replay this same tap.
    N.clearLastNotificationResponseAsync().catch(() => {});
  };
  N.getLastNotificationResponseAsync()
    .then((response) => response && handle(response))
    .catch(() => {});
  const sub = N.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
