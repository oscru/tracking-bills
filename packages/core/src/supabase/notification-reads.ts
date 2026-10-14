import type { Row } from '../types';
import { supabase } from './client';
import { SupabaseError, unwrap } from './internal';

export type NotificationRead = Row<'notification_reads'>;

/** Every notification the signed-in user has read or dismissed. */
export async function listNotificationReads(): Promise<NotificationRead[]> {
  return unwrap(await supabase.from('notification_reads').select('*')) as NotificationRead[];
}

/** Marks notifications as read (idempotent — re-marking keeps the first `read_at`). */
export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  const { error } = await supabase.from('notification_reads').upsert(
    notificationIds.map((notification_id) => ({ notification_id })),
    { onConflict: 'user_id,notification_id', ignoreDuplicates: true },
  );
  if (error) throw new SupabaseError(error);
}

/** Hides a notification from the list for good (it also counts as read). */
export async function dismissNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notification_reads')
    .upsert(
      { notification_id: notificationId, dismissed_at: new Date().toISOString() },
      { onConflict: 'user_id,notification_id' },
    );
  if (error) throw new SupabaseError(error);
}
