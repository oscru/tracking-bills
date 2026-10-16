import type { CategorySpend } from '@repo/core/utils';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CategorySpendDonut } from './category-spend-donut';
import { CategorySpendRow } from './category-spend-row';

const TOP_N = 5;
const ROOMY_MIN_WIDTH = 460;
const ROOMY_RADIUS = 104;

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
  // Wide enough (desktop dashboard, a wide window): a bigger donut with the
  // list beside it instead of below — measured from the card itself, not
  // the window, so it fits whatever column it lands in.
  const [width, setWidth] = useState(0);
  const roomy = width >= ROOMY_MIN_WIDTH;

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
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          className={roomy ? 'flex-row items-center gap-8' : 'gap-4'}
        >
          <View className="items-center">
            <CategorySpendDonut
              breakdown={breakdown}
              total={total}
              currency={currency}
              radius={roomy ? ROOMY_RADIUS : undefined}
              onSlicePress={onSelectCategory}
            />
          </View>

          <View className={roomy ? 'flex-1 gap-0.5' : 'gap-0.5'}>
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
        </View>
      ) : (
        <Text className="py-6 text-center text-sm text-ink-2 dark:text-ink-2-dark">
          Sin gastos este mes todavía.
        </Text>
      )}
    </View>
  );
}
