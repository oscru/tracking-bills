import { Skeleton } from '@repo/ui';
import { View } from 'react-native';

function Row({ isFirst, isLast }: { isFirst: boolean; isLast: boolean }) {
  return (
    <View
      className={`flex-row items-center gap-3 border-line px-3 py-3 dark:border-line-dark ${
        isFirst ? '' : 'border-t'
      }`}
    >
      <Skeleton width={38} height={38} radius={19} />
      <View className="flex-1 gap-1.5">
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={64} height={14} />
    </View>
  );
}

function DayGroup({ rows }: { rows: number }) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between pb-1 pt-2">
        <Skeleton width={90} height={12} />
        <Skeleton width={56} height={12} />
      </View>
      <View className="overflow-hidden rounded-2xl border border-line dark:border-line-dark">
        {Array.from({ length: rows }).map((_, i) => (
          <Row key={i} isFirst={i === 0} isLast={i === rows - 1} />
        ))}
      </View>
    </View>
  );
}

/** Placeholder shown while the transactions list is loading — a few
 * day-grouped cards shaped like `groupByDay`'s real sections, each with a
 * couple of rows shaped like `TransactionListItem`. */
export function TransactionsSkeleton() {
  return (
    <View className="gap-4">
      <DayGroup rows={2} />
      <DayGroup rows={3} />
      <DayGroup rows={1} />
    </View>
  );
}
