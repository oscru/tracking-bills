import { useCategories, useCreateTransaction } from '@repo/core/hooks';
import type { TransactionCreateInput } from '@repo/core/validators';
import {
  applyAmountKey,
  evalAmount,
  formatCurrency,
  toFriendlyMessage,
  todayISODate,
} from '@repo/core/utils';
import {
  AmountDisplay,
  BottomSheet,
  Button,
  ErrorCard,
  NumericKeypad,
  type KeypadKey,
} from '@repo/ui';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  accountId: string;
  currency: string;
  currentBalance: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Lets the user type the account's real-world balance and books the
 * difference as one income (balance went up) or expense (balance went down)
 * transaction — there's no dedicated "adjustment" transaction type.
 */
export function AdjustBalanceSheet({
  visible,
  onClose,
  accountId,
  currency,
  currentBalance,
}: Props) {
  const { t } = useTranslation(['accounts', 'common']);
  const createTransaction = useCreateTransaction();
  const { data: categories } = useCategories();
  const [amount, setAmount] = useState(String(round2(currentBalance)));
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reset the typed amount to the current balance each time the sheet opens.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setAmount(String(round2(currentBalance)));
      setError(null);
      setConfirmOpen(false);
    }
  }

  const value = evalAmount(amount);
  const display = formatCurrency(value ?? 0, currency);
  const diff = value == null ? 0 : round2(value - currentBalance);

  const onKey = (k: KeypadKey) => {
    setAmount((prev) => applyAmountKey(prev, k));
    setError(null);
  };

  const adjustmentType: 'income' | 'expense' | null =
    diff === 0 ? null : diff > 0 ? 'income' : 'expense';

  const askConfirm = () => {
    if (value == null) return setError(t('adjust.invalid'));
    // Target already matches the current balance — nothing to book, but
    // that's not a failure, so just close instead of surfacing an error.
    if (diff === 0) return onClose();
    setConfirmOpen(true);
  };

  const confirmAndSave = () => {
    if (value == null || diff === 0 || !adjustmentType) return;

    const adjustmentSlug =
      adjustmentType === 'income' ? 'balance_adjustment_income' : 'balance_adjustment_expense';
    const categoryId = (categories ?? []).find((c) => c.slug === adjustmentSlug)?.id;
    if (!categoryId) return setError(t('adjust.noCategory'));
    const payload: TransactionCreateInput = {
      type: adjustmentType,
      account_id: accountId,
      amount: Math.abs(diff),
      category_id: categoryId,
      description: t('adjust.description'),
      transaction_date: todayISODate(),
      is_completed: true,
    };

    createTransaction.mutate(payload, {
      onSuccess: () => {
        setConfirmOpen(false);
        onClose();
      },
      onError: (e) => {
        setConfirmOpen(false);
        setError(toFriendlyMessage(e, t('adjust.failed')));
      },
    });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('adjust.title')}>
      <View className="gap-4 px-5 pb-8 pt-2">
        <Text className="text-center text-[13px] text-ink-2 dark:text-ink-2-dark">
          {t('adjust.current', { amount: formatCurrency(currentBalance, currency) })}
        </Text>

        <AmountDisplay display={display} invalid={Boolean(error)} />

        {diff !== 0 ? (
          <Text
            className={`text-center text-[13px] font-semibold ${
              diff > 0 ? 'text-pos dark:text-pos-dark' : 'text-danger dark:text-danger-dark'
            }`}
          >
            {t(diff > 0 ? 'adjust.willIncome' : 'adjust.willExpense', {
              amount: formatCurrency(Math.abs(diff), currency),
            })}
          </Text>
        ) : null}

        <ErrorCard message={error} />

        <NumericKeypad onKey={onKey} />
        <Button label={t('common:save')} onPress={askConfirm} />
      </View>

      <BottomSheet
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('adjust.confirmTitle')}
      >
        <View className="gap-3 px-5 pb-4 pt-2">
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
            <Trans
              t={t}
              i18nKey={
                adjustmentType === 'income' ? 'adjust.confirmIncome' : 'adjust.confirmExpense'
              }
              values={{
                from: formatCurrency(currentBalance, currency),
                to: display,
                amount: formatCurrency(Math.abs(diff), currency),
              }}
              components={{ b: <Text className="font-semibold text-ink dark:text-ink-dark" /> }}
            />
          </Text>
          <Button
            label={t('adjust.confirmTitle')}
            onPress={confirmAndSave}
            loading={createTransaction.isPending}
          />
          <Pressable onPress={() => setConfirmOpen(false)} className="items-center py-2">
            <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
              {t('common:cancel')}
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </BottomSheet>
  );
}
