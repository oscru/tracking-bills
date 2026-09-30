import { Skeleton } from '@repo/ui';
import { View } from 'react-native';

/**
 * Placeholder shown while the home screen's accounts/transactions are still
 * loading — mirrors the shape of the balance card, income/expense row, and a
 * few of the more common optional cards (category spend, weekly spend,
 * accounts) closely enough to avoid a layout jump once real data lands,
 * without trying to match the user's actual `home_layout` order/selection
 * (that data isn't loaded yet either).
 */
export function HomeSkeleton() {
  return (
    <View className="gap-5">
      <View className="gap-2 rounded-card bg-surface p-5 dark:bg-surface-dark">
        <Skeleton width={100} height={13} />
        <Skeleton width={180} height={34} radius={8} />
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 gap-2 rounded-2xl bg-surface p-4 dark:bg-surface-dark">
          <Skeleton width={60} height={11} />
          <Skeleton width={90} height={22} radius={6} />
        </View>
        <View className="flex-1 gap-2 rounded-2xl bg-surface p-4 dark:bg-surface-dark">
          <Skeleton width={60} height={11} />
          <Skeleton width={90} height={22} radius={6} />
        </View>
      </View>

      <View className="gap-4 rounded-card bg-surface p-5 dark:bg-surface-dark">
        <Skeleton width={140} height={13} />
        <View className="items-center py-2">
          <Skeleton width={140} height={140} radius={70} />
        </View>
        <View className="gap-3">
          <Skeleton width="100%" height={14} />
          <Skeleton width="100%" height={14} />
        </View>
      </View>

      <View className="gap-4 rounded-card bg-surface p-5 dark:bg-surface-dark">
        <Skeleton width={130} height={13} />
        <View className="flex-row items-end gap-2">
          {[28, 44, 20, 52, 36, 60, 24].map((h, i) => (
            <View key={i} className="flex-1 items-center" style={{ height: 60 }}>
              <View className="w-full flex-1 items-center justify-end">
                <Skeleton width="100%" height={h} radius={4} />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Skeleton width={90} height={13} />
        <View className="gap-0 rounded-card border border-line dark:border-line-dark">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className={`flex-row items-center gap-3 px-4 py-3.5 ${
                i > 0 ? 'border-t border-line dark:border-line-dark' : ''
              }`}
            >
              <Skeleton width={36} height={36} radius={18} />
              <View className="flex-1">
                <Skeleton width={100} height={14} />
              </View>
              <Skeleton width={70} height={14} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
