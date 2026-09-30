import { Ionicons } from '@expo/vector-icons';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionWithRefs } from '@repo/core/supabase';
import { formatCurrency, formatDate, longestNoSpendStreak, noSpendStreak } from '@repo/core/utils';
import { CategoryDot } from '@repo/ui';
import { useColorScheme } from 'nativewind';
import { Pressable, Text, View } from 'react-native';

interface Props {
  dateISO: string;
  transactions: TransactionWithRefs[];
  currency: string;
  onPressTransaction: (id: string) => void;
}

/** The tapped day's own movements (income and expense, not transfers) — what
 * actually happened behind that one heatmap cell. */
export function DayDetailCard({ dateISO, transactions, currency, onPressTransaction }: Props) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const warningColor = dark ? '#F3B25E' : '#B45309';
  const dayTx = transactions
    .filter((t) => t.transaction_date === dateISO && t.type !== 'transfer')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const net = dayTx.reduce(
    (sum, t) => sum + (t.type === 'expense' ? -Number(t.amount) : Number(t.amount)),
    0,
  );
  const streak = dayTx.length === 0 ? noSpendStreak(transactions, dateISO) : 0;
  const bestStreak = dayTx.length === 0 ? longestNoSpendStreak(transactions) : 0;

  return (
    <View className="gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold capitalize text-ink dark:text-ink-dark">
          {formatDate(dateISO)}
        </Text>
        {dayTx.length > 0 ? (
          <Text
            className={`text-[15px] font-bold ${
              net >= 0 ? 'text-pos dark:text-pos-dark' : 'text-danger dark:text-danger-dark'
            }`}
          >
            {net >= 0 ? '+' : '−'}
            {formatCurrency(Math.abs(net), currency)}
          </Text>
        ) : null}
      </View>

      {dayTx.length === 0 ? (
        <View className="gap-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="flame-outline" size={15} color={warningColor} />
            <Text className="text-sm font-semibold" style={{ color: warningColor }}>
              {streak} día{streak === 1 ? '' : 's'} sin gastar
            </Text>
          </View>
          <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
            Mejor racha: {bestStreak} día{bestStreak === 1 ? '' : 's'}
          </Text>
        </View>
      ) : (
        <View>
          {dayTx.map((tx, i) => {
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
                <CategoryDot color={tx.category?.color} icon={tx.category?.icon} size={18} />
                <View className="flex-1">
                  <Text
                    className="text-[14px] font-medium text-ink dark:text-ink-dark"
                    numberOfLines={1}
                  >
                    {description || label}
                  </Text>
                  <Text className="text-xs text-ink-3 dark:text-ink-3-dark" numberOfLines={1}>
                    {description ? label : 'Movimiento'}
                  </Text>
                </View>
                <Text
                  className={`text-[14px] font-semibold ${
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
