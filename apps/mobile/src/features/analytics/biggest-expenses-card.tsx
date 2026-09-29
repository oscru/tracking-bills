import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionWithRefs } from '@repo/core/supabase';
import { formatCurrency, formatDate } from '@repo/core/utils';
import { CategoryDot } from '@repo/ui';
import { Pressable, Text, View } from 'react-native';

const TOP_N = 3;

interface Props {
  expenses: TransactionWithRefs[];
  currency: string;
  onSeeAll?: () => void;
  onPressTransaction: (id: string) => void;
  /** Which metric `expenses` was filtered to — drives the title and empty state text. */
  metric?: 'expense' | 'income';
}

/** The period's largest individual expenses or income entries — `topTransactions`' top 3. */
export function BiggestExpensesCard({
  expenses,
  currency,
  onSeeAll,
  onPressTransaction,
  metric = 'expense',
}: Props) {
  const top = expenses.slice(0, TOP_N);
  const title = metric === 'income' ? 'Ingresos más grandes' : 'Gastos más grandes';
  const emptyLabel = metric === 'income' ? 'Sin ingresos en este periodo.' : 'Sin gastos en este periodo.';

  return (
    <View className="gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">{title}</Text>
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
        <View>
          {top.map((tx, i) => {
            const label = tx.category ? resolveCategoryLabel(tx.category) : 'Sin categoría';
            const description = tx.description?.trim();
            return (
              <Pressable
                key={tx.id}
                onPress={() => onPressTransaction(tx.id)}
                className={`flex-row items-center gap-3 py-2.5 active:opacity-60 ${
                  i > 0 ? 'border-t border-line dark:border-line-dark' : ''
                }`}
              >
                <CategoryDot color={tx.category?.color} icon={tx.category?.icon} size={16} />
                <View className="flex-1">
                  <Text className="text-sm text-ink dark:text-ink-dark" numberOfLines={1}>
                    {description || label}
                  </Text>
                  <Text className="text-xs text-ink-3 dark:text-ink-3-dark" numberOfLines={1}>
                    {formatDate(tx.transaction_date)}
                  </Text>
                </View>
                <Text
                  className={`text-sm font-semibold ${
                    tx.type === 'expense'
                      ? 'text-danger dark:text-danger-dark'
                      : 'text-pos dark:text-pos-dark'
                  }`}
                >
                  {tx.type === 'expense' ? '−' : '+'}
                  {formatCurrency(tx.amount, currency)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
