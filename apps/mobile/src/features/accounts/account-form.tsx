import { Ionicons } from '@expo/vector-icons';
import type { AccountType } from '@repo/core/types';
import { accountCreateSchema, type AccountCreateInput } from '@repo/core/validators';
import {
  BottomSheet,
  Button,
  ColorPicker,
  CurrencyField,
  ErrorCard,
  TextField,
  ICON_COLORS,
} from '@repo/ui';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CurrencyPicker } from '../settings/currency-picker';
import { ACCOUNT_COLORS } from './account-colors';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_ICON, ACCOUNT_TYPE_LABEL } from './account-types';

export interface AccountFormInitial {
  name?: string;
  type?: AccountType;
  currency?: string;
  initial_balance?: number;
  color?: string | null;
}

interface Props {
  initial?: AccountFormInitial;
  /** The currency picker's choices — the caller resolves `profile.enabled_currencies` first, same as every other currency-picking form in the app. */
  enabledCurrencies: string[];
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: AccountCreateInput) => void;
  /** Called when the name changes — the parent should clear its `error` so it doesn't linger once the user starts fixing it. */
  onDirty?: () => void;
  footer?: ReactNode;
}

type FieldErrors = Partial<Record<'name' | 'currency' | 'initial_balance', string>>;

export function AccountForm({
  initial,
  enabledCurrencies,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onDirty,
  footer,
}: Props) {
  const editing = initial != null;
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? 'debit');
  const [currency, setCurrency] = useState(initial?.currency ?? enabledCurrencies[0] ?? 'MXN');
  const [balance, setBalance] = useState(
    initial?.initial_balance != null ? String(initial.initial_balance) : '',
  );
  const [color, setColor] = useState(initial?.color ?? ACCOUNT_COLORS[0]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  const submit = () => {
    setErrors({});
    const parsed = accountCreateSchema.safeParse({
      name,
      type,
      currency,
      // The initial balance is fixed at creation — edits go through "Ajustar saldo" instead.
      initial_balance: editing ? Number(initial?.initial_balance ?? 0) : Number(balance || 0),
      color,
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
        onChangeText={(text) => {
          setName(text);
          setErrors((prev) => ({ ...prev, name: undefined }));
          onDirty?.();
        }}
        placeholder="Ej. Cuenta de nómina"
        error={errors.name}
        invalid={Boolean(error)}
      />

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Tipo</Text>
        <Pressable
          onPress={() => setTypePickerOpen(true)}
          className="flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 py-3 dark:border-line-dark dark:bg-surface-dark"
        >
          <View className="flex-row items-center gap-2.5">
            <Ionicons name={ACCOUNT_TYPE_ICON[type]} size={18} color={ICON_COLORS.limeInk} />
            <Text className="text-[15px] font-medium text-ink dark:text-ink-dark">
              {ACCOUNT_TYPE_LABEL[type]}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={ICON_COLORS.ink3} />
        </Pressable>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Moneda</Text>
        {editing ? (
          <>
            <View className="h-[52px] flex-row items-center rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark">
              <Text className="text-[15px] font-medium text-ink dark:text-ink-dark">
                {currency}
              </Text>
            </View>
            <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
              No se puede cambiar después de crear la cuenta.
            </Text>
          </>
        ) : (
          <Pressable
            onPress={() => setCurrencyPickerOpen(true)}
            className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
          >
            <Text className="text-[15px] font-medium text-ink dark:text-ink-dark">{currency}</Text>
            <Ionicons name="chevron-down" size={18} color={ICON_COLORS.ink3} />
          </Pressable>
        )}
        {errors.currency ? (
          <Text className="text-sm text-danger dark:text-danger-dark">{errors.currency}</Text>
        ) : null}
      </View>

      {editing ? null : (
        <CurrencyField
          label="Saldo inicial"
          value={balance}
          onChangeText={setBalance}
          currency={currency.trim() || 'MXN'}
          error={errors.initial_balance}
        />
      )}

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Color</Text>
        <ColorPicker value={color} onChange={setColor} colors={ACCOUNT_COLORS} />
      </View>

      <ErrorCard message={error} />

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
                <Ionicons name={t.icon} size={16} color={ICON_COLORS.limeInk} />
              </View>
              <Text className="flex-1 text-[15px] font-medium text-ink dark:text-ink-dark">
                {t.label}
              </Text>
              {type === t.value ? (
                <Ionicons name="checkmark" size={18} color={ICON_COLORS.limeInk} />
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>

      <CurrencyPicker
        visible={currencyPickerOpen}
        onClose={() => setCurrencyPickerOpen(false)}
        selectedCode={currency}
        onSelect={(c) => {
          setCurrency(c.code);
          setCurrencyPickerOpen(false);
        }}
        codes={enabledCurrencies}
      />
    </ScrollView>
  );
}
