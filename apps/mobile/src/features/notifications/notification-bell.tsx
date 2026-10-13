import { useNotifications } from '@repo/core/hooks';
import { ICON_COLORS } from '@repo/ui';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Pressable, Text, View } from 'react-native';

/** Header bell that opens the notification center, with an unread count badge. */
export function NotificationBell() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const { unreadCount } = useNotifications();

  return (
    <Pressable
      onPress={() => router.push('/(app)/notifications')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'
      }
      className="h-[38px] w-[38px] items-center justify-center rounded-full bg-surface active:opacity-70 dark:bg-surface-dark"
    >
      <Bell size={20} color={dark ? ICON_COLORS.inkDark : ICON_COLORS.ink} />
      {unreadCount > 0 ? (
        <View className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-canvas bg-ink px-1 dark:border-canvas-dark dark:bg-lime">
          <Text className="text-[10px] font-bold text-lime dark:text-ink">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
