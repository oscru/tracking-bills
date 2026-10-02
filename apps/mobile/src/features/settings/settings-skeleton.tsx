import { Skeleton } from '@repo/ui';
import { View } from 'react-native';

function Row({ isFirst }: { isFirst: boolean }) {
  return (
    <View
      className={`gap-1.5 py-3.5 ${isFirst ? '' : 'border-t border-line dark:border-line-dark'}`}
    >
      <Skeleton width={120} height={15} />
      <Skeleton width={90} height={12} />
    </View>
  );
}

function RowGroup({ rows }: { rows: number }) {
  return (
    <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
      {Array.from({ length: rows }).map((_, i) => (
        <Row key={i} isFirst={i === 0} />
      ))}
    </View>
  );
}

/** Placeholder shown while Opciones' account/catalog counts are still
 * loading — mirrors the profile row and the two bordered `ListRow` groups. */
export function SettingsSkeleton() {
  return (
    <View className="gap-6">
      <View className="flex-row items-center gap-3 rounded-2xl border border-line px-4 py-4 dark:border-line-dark">
        <Skeleton width={48} height={48} radius={24} />
        <View className="flex-1 gap-1.5">
          <Skeleton width={140} height={15} />
          <Skeleton width={180} height={12} />
        </View>
      </View>

      <RowGroup rows={5} />
      <RowGroup rows={3} />
    </View>
  );
}
