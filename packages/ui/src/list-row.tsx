import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CategoryDot } from './category-dot';

export interface ListRowProps {
  title: string;
  subtitle?: string | null;
  /** Right-aligned value or control. */
  trailing?: ReactNode;
  /** Leading color dot (e.g. a category color). */
  dotColor?: string | null;
  /** Leading icon (e.g. a category's icon) shown instead of the dot when set. */
  icon?: string | null;
  /** Custom leading element (e.g. an account's icon tile) — replaces the dot/icon. */
  leading?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  /** The row whose detail is open beside the list (desktop master–detail). */
  selected?: boolean;
}

export function ListRow({
  title,
  subtitle,
  trailing,
  dotColor,
  icon,
  leading,
  onPress,
  showChevron = false,
  selected = false,
}: ListRowProps) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      className={`flex-row items-center gap-3 py-3.5 ${onPress ? 'active:opacity-60' : ''} ${
        selected ? '-mx-2 rounded-xl bg-lime-tint px-2 dark:bg-lime-tint-dark' : ''
      }`}
    >
      {leading ??
        (dotColor || icon ? <CategoryDot color={dotColor} icon={icon} size={15} /> : null)}

      <View className="flex-1">
        <Text className="text-base text-ink dark:text-ink-dark">{title}</Text>
        {subtitle ? (
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{subtitle}</Text>
        ) : null}
      </View>

      {trailing}
      {showChevron ? <Text className="text-lg text-ink-3 dark:text-ink-3-dark">›</Text> : null}
    </Wrapper>
  );
}
