import { useAccounts, useCreateTransaction } from '@repo/core/hooks';
import { todayISODate } from '@repo/core/utils';
import { transactionCreateSchema } from '@repo/core/validators';
import { BottomSheet, Button, CurrencyField, ErrorCard, TextField } from '@repo/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
export function AddContributionSheet({
  visible,
  onClose,
  goalId,
  goalName,
  goalCurrency,
  goalAccountId,
}: Props) {
  const { t } = useTranslation(['goals', 'transactions']);
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
    if (!accountId) return setFieldError('transactions:form.pickAccount');

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
      setFieldError(parsed.error.issues[0]?.message ?? 'transactions:form.checkData');
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: () => {
        reset();
        onClose();
      },
      onError: () => setFieldError(t('contribution.failed')),
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('contribution.title', { goal: goalName })}
    >
      <View className="gap-4 px-5 pb-8">
        <View className="gap-2">
          <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
            {t('contribution.fromAccount')}
          </Text>
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
              {selectedAccount ? selectedAccount.name : t('transactions:form.pickAccount')}
            </Text>
          </Pressable>
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {t('contribution.onlyCurrency', { currency: goalCurrency })}
          </Text>
        </View>

        <CurrencyField
          label={t('transactions:form.amount')}
          value={amountText}
          onChangeText={(v) => {
            setAmountText(v);
            setFieldError(null);
          }}
          currency={selectedAccount?.currency ?? goalCurrency}
        />

        <View className="gap-2">
          <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
            {t('transactions:form.date')}
          </Text>
          <DateField value={date} onChange={setDate} />
        </View>

        <TextField
          label={t('contribution.note')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('transactions:form.descriptionPlaceholder')}
        />

        <ErrorCard message={fieldError} />

        <Button label={t('contribution.save')} onPress={submit} loading={create.isPending} />
      </View>

      <AccountPicker
        visible={accountPickerOpen}
        onClose={() => setAccountPickerOpen(false)}
        title={t('transactions:form.fromAccount')}
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
