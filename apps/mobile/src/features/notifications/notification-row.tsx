import type { NotificationItem } from '@repo/core/hooks';
import type { NotificationCategory, NotificationSeverity } from '@repo/core/notifications';
import { daysUntil, formatDate, todayISODate } from '@repo/core/utils';
import { ICON_COLORS } from '@repo/ui';
import {
  CircleAlert,
  Clock,
  PiggyBank,
  Trophy,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Pressable, Text, View } from 'react-native';

const CATEGORY_ICON: Record<NotificationCategory, LucideIcon> = {
  pending: Clock,
  budget: Wallet,
  goal: PiggyBank,
  peer: UserRound,
};

/** Tile background class + icon color per severity — same tints the app uses for its alert cards. */
function severityStyle(severity: NotificationSeverity, dark: boolean) {
  switch (severity) {
    case 'critical':
      return {
        tile: 'bg-danger-tint dark:bg-danger-tint-dark',
        icon: dark ? ICON_COLORS.dangerDark : ICON_COLORS.danger,
      };
    case 'warning':
      return {
        tile: 'bg-warning-tint dark:bg-warning-tint-dark',
        icon: dark ? ICON_COLORS.warningDark : ICON_COLORS.warning,
      };
    case 'success':
      return {
        tile: 'bg-lime-tint dark:bg-lime-tint-dark',
        icon: dark ? ICON_COLORS.limeInkDark : ICON_COLORS.limeInk,
      };
    default:
      return {
        tile: 'bg-canvas dark:bg-canvas-dark',
        icon: dark ? ICON_COLORS.ink2Dark : ICON_COLORS.ink2,
      };
  }
}

function relativeDay(iso: string): string {
  const days = daysUntil(todayISODate(), iso);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return formatDate(iso);
}

export function NotificationRow({
  item,
  onPress,
  onDismiss,
}: {
  item: NotificationItem;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const style = severityStyle(item.severity, dark);
  const Icon =
    item.kind === 'goal-completed' || item.kind === 'goal-milestone'
      ? Trophy
      : item.severity === 'critical'
        ? CircleAlert
        : CATEGORY_ICON[item.category];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={item.read ? undefined : 'Sin leer'}
      className="flex-row gap-3 px-4 py-3.5 active:opacity-70"
    >
      <View className={`h-10 w-10 items-center justify-center rounded-full ${style.tile}`}>
        <Icon size={19} color={style.icon} />
      </View>

      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <Text
            numberOfLines={2}
            className={`flex-1 text-[15px] text-ink dark:text-ink-dark ${
              item.read ? 'font-medium' : 'font-bold'
            }`}
          >
            {item.title}
          </Text>
          {item.read ? null : <View className="h-2 w-2 rounded-full bg-lime" />}
        </View>
        <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
          {item.body}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-3 dark:text-ink-3-dark">
          {relativeDay(item.date)}
        </Text>
      </View>

      <Pressable
        onPress={onDismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Descartar notificación"
        className="h-6 w-6 items-center justify-center rounded-full active:opacity-60"
      >
        <X size={16} color={ICON_COLORS.ink3} />
      </Pressable>
    </Pressable>
  );
}
