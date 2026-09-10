import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionWithRefs } from '@repo/core/supabase';
import { formatCurrency, formatDate } from '@repo/core/utils';
import { Pressable, Text, View } from 'react-native';

export function TransactionListItem({
  transaction,
  onPress,
}: {
  transaction: TransactionWithRefs;
  onPress: () => void;
}) {
  const { type, amount, description, transaction_date, category, account } = transaction;
  const isExpense = type === 'expense';
  const currency = account?.currency ?? 'MXN';
  const label = category ? resolveCategoryLabel(category) : 'Uncategorized';

  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3 active:opacity-60">
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: (category?.color ?? '#94a3b8') + '22' }}
      >
        <View
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: category?.color ?? '#94a3b8' }}
        />
      </View>

      <View className="flex-1">
        <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">{label}</Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
          {[description?.trim(), account?.name].filter(Boolean).join(' · ') ||
            formatDate(transaction_date)}
        </Text>
      </View>

      <View className="items-end">
        <Text
          className={`text-base font-semibold ${
            isExpense
              ? 'text-neutral-900 dark:text-neutral-50'
              : 'text-green-600 dark:text-green-500'
          }`}
        >
          {isExpense ? '-' : '+'}
          {formatCurrency(amount, currency)}
        </Text>
        <Text className="text-xs text-neutral-400 dark:text-neutral-500">
          {formatDate(transaction_date)}
        </Text>
      </View>
    </Pressable>
  );
}
