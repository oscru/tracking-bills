import { useCategories, useCreateTransaction } from '@repo/core/hooks';
import type { TransactionCreateInput } from '@repo/core/validators';
import { applyAmountKey, evalAmount, formatCurrency, toFriendlyMessage, todayISODate } from '@repo/core/utils';
import { AmountDisplay, BottomSheet, Button, ErrorCard, NumericKeypad, type KeypadKey } from '@repo/ui';
import { useState } from 'react';
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

  const adjustmentType: 'income' | 'expense' | null = diff === 0 ? null : diff > 0 ? 'income' : 'expense';

  const askConfirm = () => {
    if (value == null) return setError('Monto inválido');
    if (diff === 0) return setError('Ese ya es el saldo actual');
    setConfirmOpen(true);
  };

  const confirmAndSave = () => {
    if (value == null || diff === 0 || !adjustmentType) return;

    const adjustmentSlug =
      adjustmentType === 'income' ? 'balance_adjustment_income' : 'balance_adjustment_expense';
    const categoryId = (categories ?? []).find((c) => c.slug === adjustmentSlug)?.id;
    if (!categoryId) return setError('No se encontró la categoría de ajuste de saldo');
    const payload: TransactionCreateInput = {
      type: adjustmentType,
      account_id: accountId,
      amount: Math.abs(diff),
      category_id: categoryId,
      description: 'Ajuste de saldo',
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
        setError(toFriendlyMessage(e, 'No se pudo ajustar el saldo'));
      },
    });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Ajustar saldo">
      <View className="gap-4 px-5 pb-8 pt-2">
        <Text className="text-center text-[13px] text-ink-2 dark:text-ink-2-dark">
          Saldo actual: {formatCurrency(currentBalance, currency)}
        </Text>

        <AmountDisplay display={display} invalid={Boolean(error)} />

        {diff !== 0 ? (
          <Text
            className={`text-center text-[13px] font-semibold ${
              diff > 0
                ? 'text-pos dark:text-pos-dark'
                : 'text-ink-2 dark:text-ink-2-dark'
            }`}
          >
            {diff > 0 ? 'Se registrará un ingreso de ' : 'Se registrará un gasto de '}
            {formatCurrency(Math.abs(diff), currency)}
          </Text>
        ) : null}

        <ErrorCard message={error} />

        <NumericKeypad onKey={onKey} />
        <Button label="Guardar" onPress={askConfirm} />
      </View>

      <BottomSheet
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar ajuste"
      >
        <View className="gap-3 px-5 pb-4 pt-2">
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
            Cambiar el saldo de{' '}
            <Text className="font-semibold text-ink dark:text-ink-dark">
              {formatCurrency(currentBalance, currency)}
            </Text>{' '}
            a{' '}
            <Text className="font-semibold text-ink dark:text-ink-dark">{display}</Text> creará
            un nuevo{' '}
            <Text className="font-semibold text-ink dark:text-ink-dark">
              {adjustmentType === 'income' ? 'ingreso' : 'gasto'}
            </Text>{' '}
            de {formatCurrency(Math.abs(diff), currency)} en esta cuenta.
          </Text>
          <Button
            label="Confirmar ajuste"
            onPress={confirmAndSave}
            loading={createTransaction.isPending}
          />
          <Pressable onPress={() => setConfirmOpen(false)} className="items-center py-2">
            <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">Cancelar</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </BottomSheet>
  );
}
