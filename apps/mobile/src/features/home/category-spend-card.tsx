import type { CategorySpend } from '@repo/core/utils';
import { Pressable, Text, View } from 'react-native';

import { CategorySpendDonut } from './category-spend-donut';
import { CategorySpendRow } from './category-spend-row';

const TOP_N = 5;

interface Props {
  breakdown: CategorySpend[];
  currency: string;
  onSeeAll: () => void;
  onSelectCategory: (categoryId: string) => void;
}

/** Home screen card: this month's spend as a donut, plus its top 5 categories. */
export function CategorySpendCard({ breakdown, currency, onSeeAll, onSelectCategory }: Props) {
  const total = breakdown.reduce((sum, c) => sum + c.total, 0);
  const top = breakdown.slice(0, TOP_N);
  const hasData = total > 0;

  return (
    <View className="gap-4 rounded-card bg-surface p-5 dark:bg-surface-dark">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
          Gastos por categoría
        </Text>
        {hasData ? (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              Ver todas ›
            </Text>
          </Pressable>
        ) : null}
      </View>

      {hasData ? (
        <>
          <View className="items-center">
            <CategorySpendDonut breakdown={breakdown} total={total} currency={currency} />
          </View>

          <View className="gap-0.5">
            {top.map((c) => (
              <CategorySpendRow
                key={c.categoryId ?? 'none'}
                entry={c}
                total={total}
                currency={currency}
                onPress={c.categoryId ? () => onSelectCategory(c.categoryId!) : undefined}
              />
            ))}
          </View>
        </>
      ) : (
        <Text className="py-6 text-center text-sm text-ink-2 dark:text-ink-2-dark">
          Sin gastos este mes todavía.
        </Text>
      )}
    </View>
  );
}
