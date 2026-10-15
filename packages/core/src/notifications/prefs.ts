import { z } from 'zod';

import type { NotificationKind } from './index';

/**
 * What the user wants to be notified about, stored as `profiles.notification_prefs`
 * (jsonb). Every key has a default, so a stored `{}` (the column default) or
 * an object written by an older app version always parses to a full set —
 * and `.catch` makes one invalid stored value fall back on its own, without
 * discarding the user's other choices.
 */
export const notificationPrefsSchema = z.object({
  /** Master switch for device notifications (the in-app center always works). */
  enabled: z.boolean().default(true).catch(true),
  /** A pending movement on its scheduled day. */
  pendingToday: z.boolean().default(true).catch(true),
  /** The day before a pending movement. */
  pendingTomorrow: z.boolean().default(true).catch(true),
  /** A pending movement past its date, repeated every few days. */
  pendingOverdue: z.boolean().default(true).catch(true),
  /** Crossing the budget threshold, and going over budget. */
  budgets: z.boolean().default(true).catch(true),
  /** A goal's planned contribution coming due, and falling behind its deadline. */
  goalReminders: z.boolean().default(true).catch(true),
  /** Goal milestones (25/50/75%) and completion. */
  goalAchievements: z.boolean().default(true).catch(true),
  /** A linked person sent you a transfer. */
  peerTransfers: z.boolean().default(true).catch(true),
  /** Local hour (0-23) date-based reminders go out at. */
  reminderHour: z.number().int().min(0).max(23).default(9).catch(9),
  /** Budget % that triggers the "casi llegas" warning. */
  budgetThreshold: z.number().int().min(50).max(95).default(80).catch(80),
});

export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = notificationPrefsSchema.parse({});

/** Reads the stored jsonb leniently: unknown/invalid values fall back to defaults instead of throwing. */
export function parseNotificationPrefs(stored: unknown): NotificationPrefs {
  const parsed = notificationPrefsSchema.safeParse(
    stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {},
  );
  return parsed.success ? parsed.data : DEFAULT_NOTIFICATION_PREFS;
}

/** Which preference toggle governs each notification kind. */
const KIND_TOGGLE: Record<NotificationKind, keyof NotificationPrefs> = {
  'pending-today': 'pendingToday',
  'pending-tomorrow': 'pendingTomorrow',
  'pending-overdue': 'pendingOverdue',
  'budget-threshold': 'budgets',
  'budget-exceeded': 'budgets',
  'goal-contribution-due': 'goalReminders',
  'goal-behind': 'goalReminders',
  'goal-milestone': 'goalAchievements',
  'goal-completed': 'goalAchievements',
  'peer-received': 'peerTransfers',
};

/** Whether a kind should reach the device (master switch + its own toggle). */
export function isKindEnabled(prefs: NotificationPrefs, kind: NotificationKind): boolean {
  return prefs.enabled && prefs[KIND_TOGGLE[kind]] === true;
}
