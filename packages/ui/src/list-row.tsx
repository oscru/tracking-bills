import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

export interface ListRowProps {
  title: string;
  subtitle?: string | null;
  /** Right-aligned value or control. */
  trailing?: ReactNode;
  /** Leading color dot (e.g. a category color). */
  dotColor?: string | null;
  onPress?: () => void;
  showChevron?: boolean;
}

export function ListRow({
  title,
  subtitle,
  trailing,
  dotColor,
  onPress,
  showChevron = false,
}: ListRowProps) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      className={`flex-row items-center gap-3 py-3.5 ${onPress ? 'active:opacity-60' : ''}`}
    >
      {dotColor ? (
        <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
      ) : null}

      <View className="flex-1">
        <Text className="text-base text-neutral-900 dark:text-neutral-50">{title}</Text>
        {subtitle ? (
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</Text>
        ) : null}
      </View>

      {trailing}
      {showChevron ? (
        <Text className="text-lg text-neutral-300 dark:text-neutral-600">›</Text>
      ) : null}
    </Wrapper>
  );
}
