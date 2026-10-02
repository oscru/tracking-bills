import { Skeleton } from '@repo/ui';
import { View } from 'react-native';

const HEATMAP_ROWS = 5;
const HEATMAP_COLS = 7;

function CalendarCard() {
  return (
    <View className="gap-4 rounded-card bg-surface p-5 dark:bg-surface-dark">
      <View className="flex-row justify-end gap-2">
        <Skeleton width={70} height={32} radius={16} />
        <Skeleton width={80} height={32} radius={16} />
      </View>

      <View className="flex-row">
        {Array.from({ length: HEATMAP_COLS }).map((_, i) => (
          <View key={i} className="flex-1 items-center">
            <Skeleton width={14} height={11} />
          </View>
        ))}
      </View>

      <View className="gap-1.5">
        {Array.from({ length: HEATMAP_ROWS }).map((_, row) => (
          <View key={row} className="flex-row gap-1.5">
            {Array.from({ length: HEATMAP_COLS }).map((_, col) => (
              <View key={col} className="flex-1" style={{ aspectRatio: 1 }}>
                <Skeleton width="100%" height="100%" radius={10} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function InsightsStripSkeleton() {
  return (
    <View className="flex-row gap-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          className="min-w-[136px] gap-1.5 rounded-2xl bg-surface p-3.5 dark:bg-surface-dark"
        >
          <Skeleton width={16} height={16} radius={4} />
          <Skeleton width={50} height={15} />
          <Skeleton width={80} height={11} />
        </View>
      ))}
    </View>
  );
}

function ListCard({ title, rows }: { title: number; rows: number }) {
  return (
    <View className="gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark">
      <Skeleton width={title} height={14} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} className="flex-row items-center gap-3">
          <Skeleton width={32} height={32} radius={16} />
          <View className="flex-1">
            <Skeleton width="70%" height={13} />
          </View>
          <Skeleton width={56} height={13} />
        </View>
      ))}
    </View>
  );
}

/** Placeholder shown while the Análisis tab's transactions are still
 * loading — mirrors the calendar heatmap, the insight chips strip, and the
 * category-trend/biggest-expenses list cards below it. */
export function AnalyticsSkeleton() {
  return (
    <View className="gap-5">
      <CalendarCard />
      <InsightsStripSkeleton />
      <ListCard title={140} rows={3} />
      <ListCard title={100} rows={3} />
    </View>
  );
}
