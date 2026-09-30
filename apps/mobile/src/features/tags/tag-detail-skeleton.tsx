import { Skeleton } from '@repo/ui';
import { View } from 'react-native';

/** Placeholder shown while a tag's own detail is still loading — mirrors
 * the color dot + status line and the transactions-count stat card. */
export function TagDetailSkeleton() {
  return (
    <View className="gap-5">
      <View className="flex-row items-center gap-2">
        <Skeleton width={12} height={12} radius={6} />
        <Skeleton width={40} height={13} />
      </View>

      <View className="gap-2 rounded-2xl border border-line bg-surface p-4 dark:border-line-dark dark:bg-surface-dark">
        <Skeleton width={90} height={11} />
        <Skeleton width={30} height={26} radius={6} />
        <Skeleton width={160} height={11} />
      </View>
    </View>
  );
}
