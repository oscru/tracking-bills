import type { CategorySpend } from '@repo/core/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { CardScrollView } from '../design/card-scroll-view';
import { CategorySpendDonut } from './category-spend-donut';
import { CategorySpendRow } from './category-spend-row';

/** Without `fill` (no room to scroll): just the top ones. */
const TOP_N = 5;
const ROOMY_MIN_WIDTH = 460;
const ROOMY_RADIUS = 104;

// `fill` (a Home grid cell) — see the arrangements in the component.
const FILL_SIDE_BY_SIDE_MIN_WIDTH = 460;
// The list's scrollbar sits in the card's padding (p-5 = 20px), so the
// rows reach the content edge.
const BAR_IN_PADDING = 14;
const DONUT_MIN_DIAMETER = 120;
const DONUT_MAX_DIAMETER = 440;
const STACKED_DONUT_MAX_DIAMETER = 260;
const STACKED_LIST_MIN_HEIGHT = 140;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

interface Props {
  breakdown: CategorySpend[];
  currency: string;
  onSeeAll: () => void;
  onSelectCategory: (categoryId: string) => void;
  /**
   * Fill the parent (a Home grid cell): the header stays put and every
   * category is listed, scrolling inside the card.
   */
  fill?: boolean;
}

/** Home screen card: this month's spend as a donut, plus its top 5 categories. */
export function CategorySpendCard({
  breakdown,
  currency,
  onSeeAll,
  onSelectCategory,
  fill = false,
}: Props) {
  const { t } = useTranslation('home');
  const total = breakdown.reduce((sum, c) => sum + c.total, 0);
  const top = fill ? breakdown : breakdown.slice(0, TOP_N);
  const hasData = total > 0;
  // Wide enough (desktop dashboard, a wide window): a bigger donut with the
  // list beside it instead of below — measured from the card itself, not
  // the window, so it fits whatever column it lands in.
  const [width, setWidth] = useState(0);
  const roomy = width >= ROOMY_MIN_WIDTH;

  // `fill`: the card's body (below the header) as measured, to size the
  // donut and choose the arrangement from the room the cell actually has.
  const [body, setBody] = useState({ width: 0, height: 0 });
  const rows = top.map((c) => (
    <CategorySpendRow
      key={c.categoryId ?? 'none'}
      entry={c}
      total={total}
      currency={currency}
      onPress={c.categoryId ? () => onSelectCategory(c.categoryId!) : undefined}
    />
  ));

  // `fill` arrangements, picked from the body's size:
  // - wide: the donut as big as the height allows (up to ~45% of the
  //   width), on the left like the title; the list fills the rest, its bars
  //   and amounts reaching the right edge, lined up with "Ver todas";
  // - narrow but tall: the donut on top (sized to the width), the list
  //   scrolling under it;
  // - narrow and short: just the list.
  const fillWide = body.width >= FILL_SIDE_BY_SIDE_MIN_WIDTH;
  const sideDiameter = clamp(
    Math.min(body.height, body.width * 0.45),
    DONUT_MIN_DIAMETER,
    DONUT_MAX_DIAMETER,
  );
  const stackedDiameter = clamp(
    Math.min(body.width, body.height - STACKED_LIST_MIN_HEIGHT),
    0,
    STACKED_DONUT_MAX_DIAMETER,
  );
  const donutAt = (diameter: number) => (
    <CategorySpendDonut
      breakdown={breakdown}
      total={total}
      currency={currency}
      radius={Math.floor(diameter / 2)}
      onSlicePress={onSelectCategory}
    />
  );
  const fitted = fillWide ? (
    <View className="flex-1 flex-row items-center gap-10">
      {donutAt(sideDiameter)}
      <CardScrollView
        className="flex-1 self-stretch"
        contentContainerClassName="gap-0.5"
        barInPadding={BAR_IN_PADDING}
      >
        {rows}
      </CardScrollView>
    </View>
  ) : (
    <View className="flex-1 gap-4">
      {stackedDiameter >= DONUT_MIN_DIAMETER ? (
        <View className="items-center">{donutAt(stackedDiameter)}</View>
      ) : null}
      <CardScrollView
        className="flex-1"
        contentContainerClassName="gap-0.5"
        barInPadding={BAR_IN_PADDING}
      >
        {rows}
      </CardScrollView>
    </View>
  );

  return (
    <View
      className={`gap-4 rounded-card bg-surface p-5 dark:bg-surface-dark ${fill ? 'flex-1' : ''}`}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
          {t('categorySpend.title')}
        </Text>
        {hasData ? (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              {t('categorySpend.seeAll')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {hasData && fill ? (
        <View className="flex-1" onLayout={(e) => setBody(e.nativeEvent.layout)}>
          {body.width > 0 ? fitted : null}
        </View>
      ) : hasData ? (
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

          <View className={roomy ? 'flex-1 gap-0.5' : 'gap-0.5'}>{rows}</View>
        </View>
      ) : (
        <Text className="py-6 text-center text-sm text-ink-2 dark:text-ink-2-dark">
          {t('categorySpend.empty')}
        </Text>
      )}
    </View>
  );
}
