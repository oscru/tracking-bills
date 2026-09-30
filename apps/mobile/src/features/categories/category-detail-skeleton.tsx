import { Skeleton } from '@repo/ui';
import { View } from 'react-native';

/** Placeholder shown while a category's own detail is still loading —
 * mirrors the type line, the history chart card, and a couple of
 * subcategory rows (shown even when the real category turns out to have
 * none, same as the other detail skeletons approximating a common shape). */
export function CategoryDetailSkeleton() {
  return (
    <View className="gap-5">
      <View className="flex-row items-center gap-2">
        <Skeleton width={17} height={17} radius={5} />
        <Skeleton width={50} height={13} />
      </View>

      <View className="gap-3 rounded-2xl border border-line bg-surface p-4 dark:border-line-dark dark:bg-surface-dark">
        <View>
          <Skeleton width={150} height={11} />
          <View className="mt-1.5">
            <Skeleton width={90} height={20} radius={6} />
          </View>
        </View>
        <View className="flex-row gap-2">
          <Skeleton width={90} height={32} radius={10} />
          <Skeleton width={90} height={32} radius={10} />
        </View>
        <Skeleton width="100%" height={160} radius={12} />
      </View>

      <View className="gap-2">
        <Skeleton width={110} height={13} />
        <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
          {[0, 1].map((i) => (
            <View
              key={i}
              className={`flex-row items-center gap-3 py-3.5 ${i > 0 ? 'border-t border-line dark:border-line-dark' : ''}`}
            >
              <Skeleton width={16} height={16} radius={4} />
              <Skeleton width={120} height={14} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
