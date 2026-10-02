import { useAccounts, useCreateTransaction } from '@repo/core/hooks';
import { todayISODate } from '@repo/core/utils';
import { transactionCreateSchema } from '@repo/core/validators';
import { BottomSheet, Button, CurrencyField, ErrorCard, TextField } from '@repo/ui';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AccountPicker } from '../accounts/account-picker';
import { DateField } from '../transactions/date-field';

interface Props {
  visible: boolean;
  onClose: () => void;
  goalId: string;
  goalName: string;
  /** The goal's locked currency — only accounts in this same currency can contribute (see `goalProgress`). */
  goalCurrency: string;
  /** Set when the goal is backed by a dedicated savings account (`goals.account_id`) — the
   * contribution is then recorded as a normal `to_account_id` transfer into it instead of a
   * `goal_id`-tagged one, so it round-trips through CSV export/import like any other transfer. */
  goalAccountId?: string | null;
}

/** Records a real transfer from a real account into a goal — the source
 * account's balance drops, same as any other transfer. Only accounts in the
 * goal's own currency are offered, since a contribution isn't converted. */
export function AddContributionSheet({ visible, onClose, goalId, goalName, goalCurrency, goalAccountId }: Props) {
  const { data: accounts } = useAccounts();
  const create = useCreateTransaction();

  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(todayISODate());
  const [description, setDescription] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const selectedAccount = (accounts ?? []).find((a) => a.id === accountId) ?? null;

  const reset = () => {
    setAccountId(null);
    setAmountText('');
    setDate(todayISODate());
    setDescription('');
    setFieldError(null);
  };

  const submit = () => {
    setFieldError(null);
    if (!accountId) return setFieldError('Elige una cuenta');

    const amount = Number(amountText.replace(',', '.'));
    const parsed = transactionCreateSchema.safeParse({
      type: 'transfer',
      account_id: accountId,
      amount,
      transaction_date: date,
      description: description.trim() || null,
      ...(goalAccountId ? { to_account_id: goalAccountId } : { goal_id: goalId }),
    });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Revisa los datos');
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: () => {
        reset();
        onClose();
      },
      onError: () => setFieldError('No se pudo guardar la aportación'),
    });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`Aportar a ${goalName}`}>
      <View className="gap-4 px-5 pb-8">
        <View className="gap-2">
          <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Desde la cuenta</Text>
          <Pressable
            onPress={() => setAccountPickerOpen(true)}
            className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
          >
            <Text
              className={
                selectedAccount
                  ? 'text-base text-ink dark:text-ink-dark'
                  : 'text-base text-ink-3 dark:text-ink-3-dark'
              }
            >
              {selectedAccount ? selectedAccount.name : 'Elige una cuenta'}
            </Text>
          </Pressable>
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            Solo se muestran cuentas en {goalCurrency} — esta meta no convierte divisas.
          </Text>
        </View>

        <CurrencyField
          label="Monto"
          value={amountText}
          onChangeText={(v) => {
            setAmountText(v);
            setFieldError(null);
          }}
          currency={selectedAccount?.currency ?? goalCurrency}
        />

        <View className="gap-2">
          <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Fecha</Text>
          <DateField value={date} onChange={setDate} />
        </View>

        <TextField
          label="Nota (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción"
        />

        <ErrorCard message={fieldError} />

        <Button label="Guardar aportación" onPress={submit} loading={create.isPending} />
      </View>

      <AccountPicker
        visible={accountPickerOpen}
        onClose={() => setAccountPickerOpen(false)}
        title="Cuenta origen"
        selectedId={accountId}
        onSelect={(id) => {
          setAccountId(id);
          setFieldError(null);
        }}
        currencyFilter={goalCurrency}
        excludeId={goalAccountId}
      />
    </BottomSheet>
  );
}
