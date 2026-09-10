import { useAccounts, useCategoriesByType } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionType } from '@repo/core/types';
import { todayISODate } from '@repo/core/utils';
import { transactionCreateSchema, type TransactionCreateInput } from '@repo/core/validators';
import { Button, Chip, TextField } from '@repo/ui';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

export interface TransactionFormInitial {
  type?: TransactionType;
  amount?: number;
  account_id?: string | null;
  category_id?: string | null;
  description?: string | null;
  transaction_date?: string;
}

interface Props {
  initial?: TransactionFormInitial;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: TransactionCreateInput) => void;
  /** Rendered at the bottom of the scroll area (e.g. a delete action). */
  footer?: ReactNode;
}

type FieldErrors = Partial<Record<'amount' | 'account_id' | 'transaction_date' | 'form', string>>;

export function TransactionForm({
  initial,
  submitLabel,
  submitting,
  error,
  onSubmit,
  footer,
}: Props) {
  const { data: accounts } = useAccounts();

  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '');
  const [pickedAccountId, setAccountId] = useState<string | null>(initial?.account_id ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.category_id ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.transaction_date ?? todayISODate());
  const [errors, setErrors] = useState<FieldErrors>({});

  const { data: categories } = useCategoriesByType(type);

  const activeAccounts = useMemo(() => (accounts ?? []).filter((a) => !a.archived), [accounts]);

  // Fall back to the first account until the user picks one — derived, not state.
  const accountId = pickedAccountId ?? activeAccounts[0]?.id ?? null;

  const onChangeType = (next: TransactionType) => {
    setType(next);
    setCategoryId(null); // categories are type-specific
  };

  const submit = () => {
    setErrors({});
    const parsed = transactionCreateSchema.safeParse({
      type,
      amount: Number(amount),
      account_id: accountId ?? '',
      category_id: categoryId,
      description: description.trim() || null,
      transaction_date: date,
    });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({
        amount: f.amount?.[0],
        account_id: f.account_id?.[0],
        transaction_date: f.transaction_date?.[0],
      });
      return;
    }
    onSubmit(parsed.data);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-5 pb-8"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row gap-2">
        <Chip
          label="Expense"
          selected={type === 'expense'}
          onPress={() => onChangeType('expense')}
        />
        <Chip label="Income" selected={type === 'income'} onPress={() => onChangeType('income')} />
      </View>

      <TextField
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        error={errors.amount}
      />

      <View className="gap-2">
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Category</Text>
        <View className="flex-row flex-wrap gap-2">
          {(categories ?? []).map((c) => (
            <Chip
              key={c.id}
              label={resolveCategoryLabel(c)}
              dotColor={c.color}
              selected={categoryId === c.id}
              onPress={() => setCategoryId((prev) => (prev === c.id ? null : c.id))}
            />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Account</Text>
        <View className="flex-row flex-wrap gap-2">
          {activeAccounts.map((a) => (
            <Chip
              key={a.id}
              label={a.name}
              selected={accountId === a.id}
              onPress={() => setAccountId(a.id)}
            />
          ))}
        </View>
        {errors.account_id ? <Text className="text-sm text-red-500">Pick an account</Text> : null}
      </View>

      <TextField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Groceries at the market"
      />

      <TextField
        label="Date"
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        error={errors.transaction_date}
      />

      {error ? <Text className="text-sm text-red-500">{error}</Text> : null}

      <Button label={submitLabel} onPress={submit} loading={submitting} />

      {footer}
    </ScrollView>
  );
}
