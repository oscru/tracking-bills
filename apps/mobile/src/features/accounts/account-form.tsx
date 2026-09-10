import type { AccountType } from '@repo/core/types';
import { accountCreateSchema, type AccountCreateInput } from '@repo/core/validators';
import { Button, Chip, TextField } from '@repo/ui';
import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

const TYPES: { value: AccountType; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank', label: 'Banco' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
];

export interface AccountFormInitial {
  name?: string;
  type?: AccountType;
  currency?: string;
  initial_balance?: number;
}

interface Props {
  initial?: AccountFormInitial;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: AccountCreateInput) => void;
  footer?: ReactNode;
}

type FieldErrors = Partial<Record<'name' | 'currency' | 'initial_balance', string>>;

export function AccountForm({ initial, submitLabel, submitting, error, onSubmit, footer }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? 'cash');
  const [currency, setCurrency] = useState(initial?.currency ?? 'MXN');
  const [balance, setBalance] = useState(
    initial?.initial_balance != null ? String(initial.initial_balance) : '',
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = () => {
    setErrors({});
    const parsed = accountCreateSchema.safeParse({
      name,
      type,
      currency: currency.trim().toUpperCase(),
      initial_balance: balance.trim() === '' ? 0 : Number(balance),
    });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({
        name: f.name?.[0],
        currency: f.currency?.[0],
        initial_balance: f.initial_balance?.[0],
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
      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="Ej. Cuenta de nómina"
        error={errors.name}
      />

      <View className="gap-2">
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Tipo</Text>
        <View className="flex-row flex-wrap gap-2">
          {TYPES.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              selected={type === t.value}
              onPress={() => setType(t.value)}
            />
          ))}
        </View>
      </View>

      <TextField
        label="Moneda"
        value={currency}
        onChangeText={setCurrency}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={3}
        placeholder="MXN"
        error={errors.currency}
      />

      <TextField
        label="Saldo inicial"
        value={balance}
        onChangeText={setBalance}
        keyboardType="decimal-pad"
        placeholder="0.00"
        error={errors.initial_balance}
      />

      {error ? <Text className="text-sm text-red-500">{error}</Text> : null}

      <Button label={submitLabel} onPress={submit} loading={submitting} />

      {footer}
    </ScrollView>
  );
}
