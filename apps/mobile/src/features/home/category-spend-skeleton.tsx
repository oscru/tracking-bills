import { Skeleton } from '@repo/ui';
import { View } from 'react-native';

function RowGroup({ title, rows }: { title: boolean; rows: number }) {
  return (
    <View className="gap-1">
      {title ? <Skeleton width={130} height={13} /> : null}
      <View className="rounded-card border border-line px-4 dark:border-line-dark">
        {Array.from({ length: rows }).map((_, i) => (
          <View
            key={i}
            className={`flex-row items-center gap-3 py-3 ${i > 0 ? 'border-t border-line dark:border-line-dark' : ''}`}
          >
            <Skeleton width={18} height={18} radius={5} />
            <View className="flex-1">
              <Skeleton width="60%" height={14} />
            </View>
            <Skeleton width={60} height={14} />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Placeholder shown while a category-spend breakdown is still loading —
 * shared by `monthly-spending` (one untitled row group) and
 * `category-month-spending` (two titled ones: subcategories, movements).
 */
export function CategorySpendSkeleton({
  sections,
}: {
  sections: { title: boolean; rows: number }[];
}) {
  return (
    <View className="gap-5">
      <View className="items-center rounded-card bg-surface p-6 dark:bg-surface-dark">
        <Skeleton width={200} height={200} radius={100} />
      </View>

      {sections.map((section, i) => (
        <RowGroup key={i} title={section.title} rows={section.rows} />
      ))}
    </View>
  );
}
