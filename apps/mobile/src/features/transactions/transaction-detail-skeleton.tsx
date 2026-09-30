import { Skeleton } from '@repo/ui';
import { View } from 'react-native';

function DetailRow({ isFirst }: { isFirst: boolean }) {
  return (
    <View
      className={`flex-row items-center gap-3 py-3.5 ${isFirst ? '' : 'border-t border-line dark:border-line-dark'}`}
    >
      <Skeleton width={15} height={15} radius={4} />
      <View className="flex-1 gap-1.5">
        <Skeleton width={70} height={11} />
        <Skeleton width={130} height={15} />
      </View>
    </View>
  );
}

function BalanceCardSkeleton() {
  return (
    <View className="gap-2 rounded-2xl border border-line px-4 py-3.5 dark:border-line-dark">
      <View className="flex-row items-center justify-between">
        <View className="gap-1.5">
          <Skeleton width={80} height={11} />
          <Skeleton width={90} height={15} />
        </View>
        <View className="items-end gap-1.5">
          <Skeleton width={90} height={11} />
          <Skeleton width={90} height={15} />
        </View>
      </View>
    </View>
  );
}

/** Placeholder shown while a transaction's own detail is still loading —
 * mirrors the big amount card, the category/account rows, and a balance
 * card, which covers the most common (non-transfer) shape closely enough. */
export function TransactionDetailSkeleton() {
  return (
    <View className="gap-5">
      <View className="items-center gap-2 rounded-card bg-surface p-6 dark:bg-surface-dark">
        <Skeleton width={160} height={34} radius={8} />
        <Skeleton width={90} height={12} />
        <Skeleton width={110} height={11} />
      </View>

      <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
        <DetailRow isFirst />
        <DetailRow isFirst={false} />
      </View>

      <BalanceCardSkeleton />
    </View>
  );
}
