import type { CategoryTrend } from '@repo/core/utils';
import { CategoryDot } from '@repo/ui';
import { Pressable, Text, View } from 'react-native';

const TOP_N = 3;

interface Props {
  trend: CategoryTrend[];
  onSeeAll?: () => void;
  /** Which metric `trend` was computed for — flips whether "up" reads as good (income) or bad (expense). */
  metric?: 'expense' | 'income';
}

function TrendBadge({ pct, metric }: { pct: number | null; metric: 'expense' | 'income' }) {
  if (pct == null) {
    return <Text className="text-[13px] font-semibold text-ink-3 dark:text-ink-3-dark">Nuevo</Text>;
  }
  const rounded = Math.round(pct);
  if (rounded === 0) {
    return <Text className="text-[13px] font-semibold text-ink-3 dark:text-ink-3-dark">— 0%</Text>;
  }
  const up = rounded > 0;
  const isGood = metric === 'income' ? up : !up;
  return (
    <Text
      className={`text-[13px] font-semibold ${
        isGood ? 'text-pos dark:text-pos-dark' : 'text-danger dark:text-danger-dark'
      }`}
    >
      {up ? '▲' : '▼'} {Math.abs(rounded)}%
    </Text>
  );
}

/** Which categories are climbing or shrinking vs. the previous period —
 * `categoryTrend`'s top 3, biggest current amount first. */
export function CategoryTrendCard({ trend, onSeeAll, metric = 'expense' }: Props) {
  const top = trend.slice(0, TOP_N);
  const emptyLabel = metric === 'income' ? 'Sin ingresos en este periodo.' : 'Sin gastos en este periodo.';

  return (
    <View className="gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">
          Categorías en tendencia
        </Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              Ver todas ›
            </Text>
          </Pressable>
        ) : null}
      </View>

      {top.length === 0 ? (
        <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{emptyLabel}</Text>
      ) : (
        top.map((c) => (
          <View key={c.categoryId ?? 'none'} className="flex-row items-center gap-3">
            <CategoryDot color={c.color} icon={c.icon} size={16} />
            <Text className="flex-1 text-sm text-ink dark:text-ink-dark" numberOfLines={1}>
              {c.name}
            </Text>
            <TrendBadge pct={c.pctChange} metric={metric} />
          </View>
        ))
      )}
    </View>
  );
}
