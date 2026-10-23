import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { BudgetProgressBar } from '../budgets/budget-progress-bar';
import { CardScrollView } from '../design/card-scroll-view';
import { useBudgetProgressRows } from '../budgets/use-budget-progress-rows';

/** Without `fill` (no room to scroll): just the most urgent ones. */
const TOP_N = 3;

/** Home's "at a glance" budget status — the envelopes closest to (or past)
 * their current-period limit, most urgent first. Each budget shows in its
 * own locked currency — they're not blended into a single number. */
export function BudgetsCard({ fill = false }: { fill?: boolean }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const rows = useBudgetProgressRows();

  // A budget with no categories isn't "under control" — it's broken, just
  // quiet about it (`isOverBudget` is false because nothing can ever be
  // counted as spent against it).
  const onTrack = rows.filter((r) => r.progress.hasCategories && !r.progress.isOverBudget).length;

  return (
    // `fill`: fills its Home grid cell — header fixed, every budget listed,
    // scrolling inside the card.
    <View
      className={`gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark ${fill ? 'flex-1' : ''}`}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">
          {t('budgets.title')}
        </Text>
        <Pressable onPress={() => router.push('/(app)/settings/budgets')} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            {t('budgets.seeAll')}
          </Text>
        </Pressable>
      </View>

      {rows.length === 0 ? (
        <Pressable
          onPress={() => router.push('/(app)/settings/budgets/new')}
          // Centered in whatever room the cell gives it.
          className={`items-center gap-1 py-4 ${fill ? 'flex-1 justify-center' : ''}`}
        >
          <Text className="text-sm font-medium text-lime-ink dark:text-lime-ink-dark">
            {t('budgets.create')}
          </Text>
          <Text className="text-xs text-ink-3 dark:text-ink-3-dark">{t('budgets.createHint')}</Text>
        </Pressable>
      ) : (
        <>
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {t('budgets.onTrack', { onTrack, total: rows.length })}
          </Text>
          <CardScrollView
            className={fill ? 'flex-1' : undefined}
            contentContainerClassName="gap-4"
            scrollEnabled={fill}
          >
            {(fill ? rows : rows.slice(0, TOP_N)).map(({ budget, progress }) => (
              <Pressable
                key={budget.id}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/settings/budgets/[id]',
                    params: { id: budget.id },
                  })
                }
                className="gap-2"
              >
                <Text className="text-sm text-ink dark:text-ink-dark" numberOfLines={1}>
                  {budget.name}
                </Text>
                <BudgetProgressBar
                  spent={progress.spent}
                  amount={Number(budget.amount)}
                  pct={progress.pct}
                  isOverBudget={progress.isOverBudget}
                  currency={budget.currency}
                  hasCategories={progress.hasCategories}
                />
              </Pressable>
            ))}
          </CardScrollView>
        </>
      )}
    </View>
  );
}
