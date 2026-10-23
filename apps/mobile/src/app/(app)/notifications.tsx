import {
  useDismissNotification,
  useMarkNotificationsRead,
  useNotifications,
  type NotificationItem,
} from '@repo/core/hooks';
import {
  EmptyState,
  PageHeader,
  Screen,
  StaggerItem,
  NotificationsEmptyIllustration,
} from '@repo/ui';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { NotificationRow } from '../../features/notifications/notification-row';
import { notificationTargetHref } from '../../features/notifications/target-href';

function Section({
  title,
  items,
  offset,
  onOpen,
  onDismiss,
}: {
  title: string;
  items: NotificationItem[];
  /** Stagger index of this section's first row, so both sections cascade as one list. */
  offset: number;
  onOpen: (item: NotificationItem) => void;
  onDismiss: (item: NotificationItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View className="gap-2">
      <Text className="px-1 text-[13px] font-bold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
        {title}
      </Text>
      <View className="overflow-hidden rounded-card bg-surface dark:bg-surface-dark">
        {items.map((item, i) => (
          <StaggerItem key={item.id} index={offset + i}>
            {i > 0 ? <View className="mx-4 h-px bg-line dark:bg-line-dark" /> : null}
            <NotificationRow
              item={item}
              onPress={() => onOpen(item)}
              onDismiss={() => onDismiss(item)}
            />
          </StaggerItem>
        ))}
      </View>
    </View>
  );
}

/**
 * The notification center: everything the rules in `@repo/core/notifications`
 * currently derive from the user's pending movements, budgets and goals.
 * Pushed over the tabs, so the floating tab bar isn't shown here.
 */
export default function NotificationsScreen() {
  const { t } = useTranslation('notifications');
  const router = useRouter();
  const { items, unreadCount, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const dismiss = useDismissNotification();

  const unread = items.filter((n) => !n.read);
  const read = items.filter((n) => n.read);

  const open = (item: NotificationItem) => {
    if (!item.read) markRead.mutate([item.id]);
    router.push(notificationTargetHref(item.target));
  };

  return (
    <Screen className="gap-4">
      <PageHeader
        title={t('center.title')}
        onBack={() => router.back()}
        action={
          unreadCount > 0 ? (
            <Pressable
              onPress={() => markRead.mutate(unread.map((n) => n.id))}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
                {t('center.markAllRead')}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : items.length === 0 ? (
        <EmptyState
          illustration={<NotificationsEmptyIllustration />}
          title={t('center.emptyTitle')}
          description={t('center.emptyBody')}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 pb-8"
          showsVerticalScrollIndicator={false}
        >
          <Section
            title={t('center.new')}
            items={unread}
            offset={0}
            onOpen={open}
            onDismiss={(n) => dismiss.mutate(n.id)}
          />
          <Section
            title={t('center.earlier')}
            items={read}
            offset={unread.length}
            onOpen={open}
            onDismiss={(n) => dismiss.mutate(n.id)}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
