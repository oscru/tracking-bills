import type { NotificationTarget } from '@repo/core/notifications';
import type { Href } from 'expo-router';

/** The screen a notification opens — shared by the in-app center and a tapped device notification. */
export function notificationTargetHref(target: NotificationTarget): Href {
  switch (target.type) {
    case 'transaction':
      return { pathname: '/(app)/transactions/[id]', params: { id: target.id } };
    case 'budget':
      return { pathname: '/(app)/settings/budgets/[id]', params: { id: target.id } };
    case 'goal':
      return { pathname: '/(app)/settings/goals/[id]', params: { id: target.id } };
  }
}

function asTarget(type: unknown, id: unknown): NotificationTarget | null {
  if (typeof id !== 'string' || !id) return null;
  if (type === 'transaction' || type === 'budget' || type === 'goal') return { type, id };
  return null;
}

/**
 * Reads the target back out of a tapped device notification's `data`.
 * Current payloads are flat (`targetType`/`targetId`); older ones nested a
 * `target` object, which can also come back from Android as a JSON string —
 * all three are accepted so nothing scheduled before an update breaks.
 */
export function parseNotificationTarget(data: Record<string, unknown>): NotificationTarget | null {
  const flat = asTarget(data.targetType, data.targetId);
  if (flat) return flat;
  let nested = data.target;
  if (typeof nested === 'string') {
    try {
      nested = JSON.parse(nested);
    } catch {
      return null;
    }
  }
  if (!nested || typeof nested !== 'object') return null;
  const { type, id } = nested as { type?: unknown; id?: unknown };
  return asTarget(type, id);
}
