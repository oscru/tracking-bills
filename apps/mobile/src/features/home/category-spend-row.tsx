import type { CategorySpend } from '@repo/core/utils';
import { formatCurrency } from '@repo/core/utils';
import { CategoryDot } from '@repo/ui';
import { Pressable, Text, View } from 'react-native';

interface Props {
  entry: CategorySpend;
  /** The month's total expense — used to compute this row's share. */
  total: number;
  currency: string;
  onPress?: () => void;
}

/**
 * One category's line in a spend breakdown: dot/icon + name + share, amount
 * on the right, and a thin bar underneath filled to its share of the month —
 * tinted in the category's own color, so the list reads as an extension of
 * the donut chart above it rather than a separate table.
 */
export function CategorySpendRow({ entry, total, currency, onPress }: Props) {
  const pct = total > 0 ? entry.total / total : 0;
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      className={`gap-2 py-2.5 ${onPress ? 'active:opacity-60' : ''}`}
    >
      <View className="flex-row items-center gap-2.5">
        <CategoryDot color={entry.color} icon={entry.icon} size={18} />
        <View className="flex-1">
          <Text
            className="text-[15px] font-medium text-ink dark:text-ink-dark"
            numberOfLines={1}
          >
            {entry.name}
          </Text>
          <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
            {Math.round(pct * 100)}% del mes
          </Text>
        </View>
        <Text className="text-[15px] font-semibold text-ink dark:text-ink-dark">
          {formatCurrency(entry.total, currency)}
        </Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-line dark:bg-line-dark">
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.max(pct * 100, 2)}%`, backgroundColor: entry.color }}
        />
      </View>
    </Wrapper>
  );
}
