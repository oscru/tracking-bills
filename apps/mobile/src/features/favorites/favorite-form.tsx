import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useCategories } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionType } from '@repo/core/types';
import {
  favoriteTransactionCreateSchema,
  type FavoriteTransactionCreateInput,
} from '@repo/core/validators';
import { Button, ErrorCard, SegmentedControl, SwitchRow, TextField } from '@repo/ui';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AccountPicker } from '../accounts/account-picker';
import { CategoryPicker } from '../categories/category-picker';
import { IconPicker } from './icon-picker';

export interface FavoriteFormInitial {
  label?: string;
  icon?: string | null;
  type?: TransactionType;
  account_id?: string | null;
  to_account_id?: string | null;
  category_id?: string | null;
  amount?: number | null;
  description?: string | null;
}

interface Props {
  initial?: FavoriteFormInitial;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: FavoriteTransactionCreateInput) => void;
  /** Called whenever a field changes — the parent should clear its `error` so it doesn't linger once the user starts fixing it. */
  onDirty?: () => void;
  footer?: ReactNode;
}

const TYPE_OPTIONS = [
  { value: 'expense' as const, label: 'Gasto', icon: 'arrow-up-circle' as const },
  { value: 'income' as const, label: 'Ingreso', icon: 'arrow-down-circle' as const },
  { value: 'transfer' as const, label: 'Transferencia', icon: 'swap-horizontal' as const },
];

export function FavoriteForm({
  initial,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onDirty,
  footer,
}: Props) {
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const activeAccounts = useMemo(() => (accounts ?? []).filter((a) => !a.archived), [accounts]);

  const [label, setLabel] = useState(initial?.label ?? '');
  const [icon, setIcon] = useState<string | null>(initial?.icon ?? null);
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense');
  const [pickedAccount, setPickedAccount] = useState<string | null>(initial?.account_id ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(initial?.to_account_id ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.category_id ?? null);
  const [fixedAmount, setFixedAmount] = useState(initial?.amount != null);
  const [amountText, setAmountText] = useState(
    initial?.amount != null ? String(initial.amount) : '',
  );
  const [description, setDescription] = useState(initial?.description ?? '');

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [toAccountPickerOpen, setToAccountPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const accountId = pickedAccount ?? activeAccounts[0]?.id ?? null;
  const selectedAccount = activeAccounts.find((a) => a.id === accountId) ?? null;
  const selectedToAccount = activeAccounts.find((a) => a.id === toAccountId) ?? null;
  const selectedCategory = (categories ?? []).find((c) => c.id === categoryId) ?? null;

  const dirty = () => {
    setFieldError(null);
    onDirty?.();
  };

  const changeType = (next: TransactionType) => {
    setType(next);
    if (next === 'transfer') setCategoryId(null);
    else setToAccountId(null);
    dirty();
  };

  const submit = () => {
    setFieldError(null);
    if (!label.trim()) return setFieldError('Ponle un nombre');
    if (!icon) return setFieldError('Elige un ícono');
    if (!accountId) return setFieldError('Elige una cuenta');

    let amount: number | null = null;
    if (fixedAmount) {
      amount = Number(amountText.replace(',', '.'));
      if (!Number.isFinite(amount) || amount <= 0) {
        return setFieldError('El monto debe ser mayor a 0');
      }
    }

    const common = {
      label: label.trim(),
      icon,
      account_id: accountId,
      amount,
      description: description.trim() || null,
    };
    const payload =
      type === 'transfer'
        ? { ...common, type: 'transfer' as const, to_account_id: toAccountId ?? '' }
        : { ...common, type, category_id: categoryId };

    const parsed = favoriteTransactionCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldError(
        type === 'transfer' && !toAccountId
          ? 'Elige la cuenta destino'
          : (parsed.error.issues[0]?.message ?? 'Revisa los datos'),
      );
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
      <View className="items-center gap-2">
        <Pressable
          onPress={() => setIconPickerOpen(true)}
          className="h-16 w-16 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark"
        >
          <Ionicons
            name={(icon as keyof typeof Ionicons.glyphMap) ?? 'add-outline'}
            size={26}
            color="#4D7C0F"
          />
        </Pressable>
        <Pressable onPress={() => setIconPickerOpen(true)} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            {icon ? 'Cambiar ícono' : 'Elegir ícono'}
          </Text>
        </Pressable>
      </View>

      <TextField
        label="Nombre"
        value={label}
        onChangeText={(text) => {
          setLabel(text);
          dirty();
        }}
        placeholder="Ej. Café"
        maxLength={40}
      />

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Tipo</Text>
        <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={changeType} />
      </View>

      <Field label={type === 'transfer' ? 'De' : 'Cuenta'}>
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
          <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            Ver todas ›
          </Text>
        </Pressable>
      </Field>

      {type === 'transfer' ? (
        <Field label="A">
          <Pressable
            onPress={() => setToAccountPickerOpen(true)}
            className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
          >
            <Text
              className={
                selectedToAccount
                  ? 'text-base text-ink dark:text-ink-dark'
                  : 'text-base text-ink-3 dark:text-ink-3-dark'
              }
            >
              {selectedToAccount ? selectedToAccount.name : 'Elige una cuenta'}
            </Text>
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              Ver todas ›
            </Text>
          </Pressable>
        </Field>
      ) : (
        <Field label="Categoría">
          <Pressable
            onPress={() => setCategoryPickerOpen(true)}
            className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
          >
            <View className="flex-row items-center gap-2">
              {selectedCategory ? (
                <View
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: selectedCategory.color ?? '#94A3B8' }}
                />
              ) : null}
              <Text
                className={
                  selectedCategory
                    ? 'text-base text-ink dark:text-ink-dark'
                    : 'text-base text-ink-3 dark:text-ink-3-dark'
                }
              >
                {selectedCategory ? resolveCategoryLabel(selectedCategory) : 'Elige una categoría'}
              </Text>
            </View>
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              Ver todas ›
            </Text>
          </Pressable>
        </Field>
      )}

      <SwitchRow
        label="Monto fijo"
        description={
          fixedAmount
            ? 'Se prellena, pero puedes ajustarlo antes de guardar'
            : 'Monto libre — lo escribes cada vez que lo uses'
        }
        value={fixedAmount}
        onValueChange={(v) => {
          setFixedAmount(v);
          dirty();
        }}
      />

      {fixedAmount ? (
        <TextField
          label="Monto"
          value={amountText}
          onChangeText={(t) => {
            setAmountText(t);
            dirty();
          }}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      ) : null}

      <TextField
        label="Descripción (opcional)"
        value={description}
        onChangeText={(t) => {
          setDescription(t);
          dirty();
        }}
        placeholder="Descripción"
      />

      <ErrorCard message={fieldError ?? error} />

      <Button label={submitLabel} onPress={submit} loading={submitting} />

      {footer}

      <IconPicker
        visible={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        value={icon}
        onSelect={(name) => {
          setIcon(name);
          dirty();
        }}
      />
      <AccountPicker
        visible={accountPickerOpen}
        onClose={() => setAccountPickerOpen(false)}
        title={type === 'transfer' ? 'Cuenta origen' : 'Cuenta'}
        selectedId={accountId}
        onSelect={(id) => {
          setPickedAccount(id);
          dirty();
        }}
      />
      <AccountPicker
        visible={toAccountPickerOpen}
        onClose={() => setToAccountPickerOpen(false)}
        title="Cuenta destino"
        selectedId={toAccountId}
        onSelect={(id) => {
          setToAccountId(id);
          dirty();
        }}
        excludeId={accountId}
      />
      <CategoryPicker
        visible={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        type={type === 'income' ? 'income' : 'expense'}
        selectedId={categoryId}
        onSelect={(id) => {
          setCategoryId(id);
          dirty();
        }}
        allowNone={false}
      />
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">{label}</Text>
      {children}
    </View>
  );
}
