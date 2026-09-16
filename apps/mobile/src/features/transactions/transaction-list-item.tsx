import { Ionicons } from '@expo/vector-icons';
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
  const {
    type,
    amount,
    description,
    transaction_date,
    category,
    account,
    to_account,
    is_completed,
  } = transaction;
  const currency = account?.currency ?? 'MXN';
  const value = formatCurrency(amount, currency);

  let title: string;
  let subtitle: string;
  let sign: string;
  let amountClass: string;
  let color: string;

  if (type === 'transfer') {
    title = 'Transferencia';
    subtitle = `${account?.name ?? '—'} → ${to_account?.name ?? '—'}`;
    sign = '';
    amountClass = 'text-ink-2 dark:text-ink-2-dark';
    color = '#4D7C0F';
  } else {
    title = category ? resolveCategoryLabel(category) : 'Sin categoría';
    subtitle =
      [description?.trim(), account?.name].filter(Boolean).join(' · ') ||
      formatDate(transaction_date);
    sign = type === 'income' ? '+' : '−';
    amountClass = type === 'income' ? 'text-pos dark:text-pos-dark' : 'text-ink dark:text-ink-dark';
    color = category?.color ?? '#94A3B8';
  }

  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3 active:opacity-60">
      <View
        className="h-[38px] w-[38px] items-center justify-center rounded-full"
        style={{ backgroundColor: type === 'transfer' ? '#F2FBDC' : color + '1F' }}
      >
        {type === 'transfer' ? (
          <Ionicons name="swap-horizontal" size={18} color={color} />
        ) : (
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        )}
      </View>

      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-ink dark:text-ink-dark">{title}</Text>
        <Text className="text-[13px] text-ink-2 dark:text-ink-2-dark" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View className="items-end">
        <Text className={`text-[15px] font-bold ${amountClass}`}>
          {sign}
          {value}
        </Text>
        {is_completed === false ? (
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-[#B45309]">
            Pendiente
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
