import { useFormError, useUpdateTransaction } from '@repo/core/hooks';
import type { TransactionType } from '@repo/core/types';
import { todayISODate } from '@repo/core/utils';
import { BottomSheet, Button, ErrorCard } from '@repo/ui';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { DateField } from './date-field';

const QUESTION: Record<TransactionType, string> = {
  expense: '¿Cuándo se hizo el pago?',
  income: '¿Cuándo se recibió?',
  transfer: '¿Cuándo se hizo la transferencia?',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  transactionId: string;
  type: TransactionType;
}

/**
 * Confirms a pending movement as done, asking when it actually happened —
 * today by default, yesterday or any other date one tap away. Saving sets
 * `is_completed` and moves its date to that day, so balances and reminders
 * follow on their own.
 */
export function MarkDoneSheet({ visible, onClose, transactionId, type }: Props) {
  const update = useUpdateTransaction();
  const { error, setError, clearError } = useFormError();
  const [date, setDate] = useState(() => todayISODate());

  // Every time it opens, start again from today.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDate(todayISODate());
      clearError();
    }
  }

  const confirm = () => {
    clearError();
    update.mutate(
      { id: transactionId, patch: { is_completed: true, transaction_date: date } },
      {
        onSuccess: onClose,
        onError: (e) => setError(e, 'No se pudo marcar como realizado'),
      },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Marcar como realizado">
      <View className="gap-4 px-5 pb-6 pt-1">
        <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{QUESTION[type]}</Text>
        <DateField value={date} onChange={setDate} />
        <ErrorCard message={error} />
        <Button label="Marcar como realizado" onPress={confirm} loading={update.isPending} />
      </View>
    </BottomSheet>
  );
}
