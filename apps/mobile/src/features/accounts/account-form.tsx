import { Ionicons } from '@expo/vector-icons';
import type { AccountType } from '@repo/core/types';
import { accountCreateSchema, type AccountCreateInput } from '@repo/core/validators';
import { BottomSheet, Button, TextField } from '@repo/ui';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ACCOUNT_TYPES, ACCOUNT_TYPE_ICON, ACCOUNT_TYPE_LABEL } from './account-types';

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
  const editing = initial != null;
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? 'debit');
  const [currency, setCurrency] = useState(initial?.currency ?? 'MXN');
  const [balance, setBalance] = useState(
    initial?.initial_balance != null ? String(initial.initial_balance) : '',
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const submit = () => {
    setErrors({});
    const parsed = accountCreateSchema.safeParse({
      name,
      type,
      currency: currency.trim().toUpperCase(),
      // The initial balance is fixed at creation — edits go through "Ajustar saldo" instead.
      initial_balance: editing ? Number(initial?.initial_balance ?? 0) : Number(balance || 0),
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
    const data: Partial<AccountCreateInput> = { ...parsed.data };
    if (editing) delete data.initial_balance;
    onSubmit(data as AccountCreateInput);
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
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Tipo</Text>
        <Pressable
          onPress={() => setTypePickerOpen(true)}
          className="flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 py-3 dark:border-line-dark dark:bg-surface-dark"
        >
          <View className="flex-row items-center gap-2.5">
            <Ionicons name={ACCOUNT_TYPE_ICON[type]} size={18} color="#4D7C0F" />
            <Text className="text-[15px] font-medium text-ink dark:text-ink-dark">
              {ACCOUNT_TYPE_LABEL[type]}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        </Pressable>
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

      {editing ? null : (
        <TextField
          label="Saldo inicial"
          value={balance}
          onChangeText={setBalance}
          keyboardType="decimal-pad"
          placeholder="0.00"
          error={errors.initial_balance}
        />
      )}

      {error ? <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text> : null}

      <Button label={submitLabel} onPress={submit} loading={submitting} />

      {footer}

      <BottomSheet
        visible={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        title="Tipo de cuenta"
      >
        <ScrollView contentContainerClassName="pb-4">
          {ACCOUNT_TYPES.map((t) => (
            <Pressable
              key={t.value}
              onPress={() => {
                setType(t.value);
                setTypePickerOpen(false);
              }}
              className="flex-row items-center gap-3 border-t border-line px-5 py-3.5 dark:border-line-dark"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                <Ionicons name={t.icon} size={16} color="#4D7C0F" />
              </View>
              <Text className="flex-1 text-[15px] font-medium text-ink dark:text-ink-dark">
                {t.label}
              </Text>
              {type === t.value ? <Ionicons name="checkmark" size={18} color="#4D7C0F" /> : null}
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>
    </ScrollView>
  );
}
