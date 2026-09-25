import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useCategories, useTags } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionType } from '@repo/core/types';
import { applyAmountKey, evalAmount, formatCurrency, todayISODate } from '@repo/core/utils';
import { transactionCreateSchema, type TransactionCreateInput } from '@repo/core/validators';
import {
  AmountDisplay,
  Button,
  Chip,
  ErrorCard,
  NumericKeypad,
  Screen,
  SegmentedControl,
  SwitchRow,
  TextField,
  type KeypadKey,
} from '@repo/ui';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountPicker } from '../accounts/account-picker';
import { CategoryPicker } from '../categories/category-picker';
import { CategoryQuickCreateSheet } from '../categories/category-quick-create-sheet';
import { TagQuickCreateSheet } from '../tags/tag-quick-create-sheet';
import { DateField } from './date-field';
import type { TransactionDraftSnapshot } from './draft-transaction-store';
import { DiscardConfirmSheet } from './discard-confirm-sheet';
import { MultiSelectSheet } from './multi-select-sheet';

export interface MovementFormInitial {
  type?: TransactionType;
  amount?: number;
  account_id?: string | null;
  to_account_id?: string | null;
  category_id?: string | null;
  /** Tag ids currently on the transaction. */
  tags?: string[];
  description?: string | null;
  transaction_date?: string;
  is_completed?: boolean;
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = [...b].sort();
  return [...a].sort().every((id, i) => id === sorted[i]);
}

const AMOUNT_ERROR = 'El monto no puede ser cero';

interface Props {
  mode: 'create' | 'edit';
  initial?: MovementFormInitial;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: TransactionCreateInput, tagIds: string[]) => void;
  onCancel: () => void;
  onDelete?: () => void;
  /** Resume from a minimized draft — takes precedence over `initial`. */
  draft?: TransactionDraftSnapshot | null;
  /** Present only when minimizing is supported (the "new transaction" flow). */
  onMinimize?: (snapshot: TransactionDraftSnapshot) => void;
}

const TYPE_OPTIONS = [
  { value: 'expense' as const, label: 'Gasto', icon: 'arrow-up-circle' as const },
  { value: 'income' as const, label: 'Ingreso', icon: 'arrow-down-circle' as const },
  { value: 'transfer' as const, label: 'Transferencia', icon: 'swap-horizontal' as const },
];

function prettyExpr(s: string): string {
  return s
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' ÷ ')
    .replace(/(?<=\d)-/g, ' − ')
    .replace(/\+/g, ' + ')
    .trim();
}

export function MovementForm({
  mode,
  initial,
  submitting,
  error,
  onSubmit,
  onCancel,
  onDelete,
  draft,
  onMinimize,
}: Props) {
  const insets = useSafeAreaInsets();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const activeAccounts = useMemo(() => (accounts ?? []).filter((a) => !a.archived), [accounts]);

  const [view, setView] = useState<'amount' | 'details'>(
    draft?.view ?? (mode === 'create' ? 'amount' : 'details'),
  );
  const [type, setType] = useState<TransactionType>(draft?.type ?? initial?.type ?? 'expense');
  const [amount, setAmount] = useState(
    draft?.amount ?? (initial?.amount != null ? String(initial.amount) : ''),
  );
  const [pickedFrom, setFrom] = useState<string | null>(
    draft?.accountId ?? initial?.account_id ?? null,
  );
  const [pickedTo, setTo] = useState<string | null>(
    draft?.toAccountId ?? initial?.to_account_id ?? null,
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    draft?.categoryId ?? initial?.category_id ?? null,
  );
  const [tagIds, setTagIds] = useState<string[]>(draft?.tagIds ?? initial?.tags ?? []);
  const [description, setDescription] = useState(draft?.description ?? initial?.description ?? '');
  const [date, setDate] = useState(draft?.date ?? initial?.transaction_date ?? todayISODate());
  const [isCompleted, setIsCompleted] = useState(
    draft?.isCompleted ?? initial?.is_completed ?? true,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [toAccountPickerOpen, setToAccountPickerOpen] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [categoryQuickCreateOpen, setCategoryQuickCreateOpen] = useState(false);
  const [tagQuickCreateOpen, setTagQuickCreateOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fromId = pickedFrom ?? activeAccounts[0]?.id ?? null;
  const toId = pickedTo;
  const currency = activeAccounts.find((a) => a.id === fromId)?.currency ?? 'MXN';

  const value = evalAmount(amount);
  const lastOperand = amount
    .split(/[+\-*/]/)
    .filter(Boolean)
    .pop();
  const shown = value ?? (lastOperand ? Number(lastOperand) : 0);
  const display = formatCurrency(Number.isFinite(shown) ? shown : 0, currency);
  const hasOp = /[*/+]/.test(amount) || /\d-/.test(amount);

  const selectedCategory = (categories ?? []).find((c) => c.id === categoryId) ?? null;
  const selectedFromAccount = activeAccounts.find((a) => a.id === fromId) ?? null;
  const selectedToAccount = activeAccounts.find((a) => a.id === toId) ?? null;
  const amountInvalid = formError === AMOUNT_ERROR;

  // Archived tags stay selectable here only if they're already on this
  // transaction, so editing an old movement doesn't silently drop its tag.
  const tagOptions = useMemo(
    () =>
      (tags ?? [])
        .filter((t) => !t.archived || tagIds.includes(t.id))
        .map((t) => ({ value: t.id, label: t.name, dotColor: t.color })),
    [tags, tagIds],
  );

  const dirty =
    amount !== (initial?.amount != null ? String(initial.amount) : '') ||
    description !== (initial?.description ?? '') ||
    categoryId !== (initial?.category_id ?? null) ||
    pickedFrom !== (initial?.account_id ?? null) ||
    pickedTo !== (initial?.to_account_id ?? null) ||
    !sameIds(tagIds, initial?.tags ?? []) ||
    isCompleted !== (initial?.is_completed ?? true);

  const onKey = (k: KeypadKey) => setAmount((prev) => applyAmountKey(prev, k));

  const changeType = (next: TransactionType) => {
    setType(next);
    if (next === 'transfer') setCategoryId(null);
    else setTo(null);
  };

  const goToDetails = () => {
    setFormError(null);
    if (!fromId) return setFormError('Elige una cuenta');
    if (value == null || value <= 0) return setFormError(AMOUNT_ERROR);
    setAmount(String(value));
    setView('details');
  };

  const submit = () => {
    setFormError(null);
    if (value == null || value <= 0) return setFormError(AMOUNT_ERROR);
    if (!fromId) return setFormError('Elige una cuenta');

    const common = {
      account_id: fromId,
      amount: value,
      description: description.trim() || null,
      transaction_date: date,
      is_completed: isCompleted,
    };
    const payload =
      type === 'transfer'
        ? { ...common, type: 'transfer' as const, to_account_id: toId ?? '' }
        : { ...common, type, category_id: categoryId };

    const parsed = transactionCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError(
        type === 'transfer' && !toId
          ? 'Elige la cuenta destino'
          : (parsed.error.issues[0]?.message ?? 'Revisa los datos'),
      );
      return;
    }
    onSubmit(parsed.data, tagIds);
  };

  const tryCancel = () => (dirty ? setConfirmCancel(true) : onCancel());

  const minimize = () => {
    onMinimize?.({
      view,
      type,
      amount,
      accountId: pickedFrom,
      toAccountId: pickedTo,
      categoryId,
      tagIds,
      description,
      date,
      isCompleted,
    });
  };

  // --- amount step ---
  if (view === 'amount') {
    return (
      <Screen edges={['top']} className="gap-3">
        <View className="flex-row items-center gap-3 pt-2">
          <Pressable
            onPress={tryCancel}
            className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F2F4] dark:bg-line-dark"
          >
            <Ionicons name="close" size={18} color="#1A1D21" />
          </Pressable>
          <Text className="flex-1 text-xl font-bold text-ink dark:text-ink-dark">
            {mode === 'create' ? 'Nuevo movimiento' : 'Editar movimiento'}
          </Text>
          {onMinimize ? (
            <Pressable
              onPress={minimize}
              accessibilityLabel="Minimizar"
              className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F2F4] dark:bg-line-dark"
            >
              <Ionicons name="remove" size={20} color="#1A1D21" />
            </Pressable>
          ) : null}
        </View>

        <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={changeType} />

        <View className="flex-1 items-center justify-center gap-2">
          <Text className="text-[13px] font-semibold text-ink-2 dark:text-ink-2-dark">Monto</Text>
          <AmountDisplay
            display={display}
            hint={hasOp ? prettyExpr(amount) : null}
            invalid={amountInvalid}
          />
        </View>

        <View className="flex-row flex-wrap justify-center gap-2">
          {activeAccounts.map((a) => (
            <Chip
              key={a.id}
              label={a.name}
              selected={fromId === a.id}
              onPress={() => setFrom(a.id)}
            />
          ))}
        </View>

        <ErrorCard message={formError} />

        <NumericKeypad onKey={onKey} />
        <Button label="Continuar" onPress={goToDetails} />

        <DiscardConfirmSheet
          visible={confirmCancel}
          onKeep={() => setConfirmCancel(false)}
          onDiscard={onCancel}
        />
      </Screen>
    );
  }

  // --- details step ---
  return (
    <Screen edges={['top']} className="gap-4">
      <View className="flex-row items-center gap-3 pt-2">
        <Pressable
          onPress={tryCancel}
          className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F2F4] dark:bg-line-dark"
        >
          <Ionicons name="close" size={18} color="#1A1D21" />
        </Pressable>
        <Text className="flex-1 text-xl font-bold text-ink dark:text-ink-dark">
          {mode === 'create' ? 'Nuevo movimiento' : 'Editar movimiento'}
        </Text>
        {onMinimize ? (
          <Pressable
            onPress={minimize}
            accessibilityLabel="Minimizar"
            className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F2F4] dark:bg-line-dark"
          >
            <Ionicons name="remove" size={20} color="#1A1D21" />
          </Pressable>
        ) : null}
      </View>

      <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={changeType} />

      <Pressable
        onPress={() => setView('amount')}
        className="items-center rounded-card bg-surface py-4 dark:bg-surface-dark"
      >
        <Text className="text-[13px] font-semibold text-ink-2 dark:text-ink-2-dark">Monto</Text>
        <Text className="mt-1 text-3xl font-bold tracking-tight text-ink dark:text-ink-dark">
          {display}
        </Text>
      </Pressable>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-4">
        <Field label="Fecha">
          <DateField value={date} onChange={setDate} />
        </Field>

        {type === 'transfer' ? (
          <>
            <Field label="De">
              <Pressable
                onPress={() => setAccountPickerOpen(true)}
                className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
              >
                <Text className="text-base text-ink dark:text-ink-dark">
                  {selectedFromAccount ? selectedFromAccount.name : 'Elige una cuenta'}
                </Text>
                <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
                  Ver todas ›
                </Text>
              </Pressable>
            </Field>
            <Field label="A">
              <Pressable
                onPress={() => setToAccountPickerOpen(true)}
                className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
              >
                <Text className="text-base text-ink dark:text-ink-dark">
                  {selectedToAccount ? selectedToAccount.name : 'Elige una cuenta'}
                </Text>
                <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
                  Ver todas ›
                </Text>
              </Pressable>
            </Field>
            <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
              No cuenta como ingreso ni gasto — solo mueve saldo entre tus cuentas.
            </Text>
          </>
        ) : (
          <>
            <Field label="Cuenta">
              <Pressable
                onPress={() => setAccountPickerOpen(true)}
                className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
              >
                <Text className="text-base text-ink dark:text-ink-dark">
                  {selectedFromAccount ? selectedFromAccount.name : 'Elige una cuenta'}
                </Text>
                <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
                  Ver todas ›
                </Text>
              </Pressable>
            </Field>

            <Field label="Categoría">
              <Pressable
                onPress={() => setPickerOpen(true)}
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
          </>
        )}

        <Field label="Tags">
          <Pressable
            onPress={() => setTagPickerOpen(true)}
            className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
          >
            <Text className="text-base text-ink dark:text-ink-dark">
              {tagIds.length === 0
                ? 'Sin tags'
                : `${tagIds.length} tag${tagIds.length === 1 ? '' : 's'} seleccionada${tagIds.length === 1 ? '' : 's'}`}
            </Text>
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              Ver todas ›
            </Text>
          </Pressable>
        </Field>

        <TextField
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción"
        />

        <SwitchRow
          label="Completada"
          description={isCompleted ? 'Ya se realizó' : 'Pendiente por realizarse'}
          value={isCompleted}
          onValueChange={setIsCompleted}
        />

        {mode === 'edit' && onDelete ? (
          confirmDelete ? (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label="Conservar"
                  variant="secondary"
                  onPress={() => setConfirmDelete(false)}
                />
              </View>
              <View className="flex-1">
                <Button label="Eliminar" onPress={onDelete} />
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmDelete(true)} className="items-center py-2">
              <Text className="text-sm font-semibold text-danger dark:text-danger-dark">
                Eliminar movimiento
              </Text>
            </Pressable>
          )
        ) : null}
      </ScrollView>

      <View
        className="gap-2 border-t border-line bg-canvas pt-3 dark:border-line-dark dark:bg-canvas-dark"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <ErrorCard message={formError ?? error} />
        <Button label="Guardar" onPress={submit} loading={submitting} />
      </View>

      <CategoryPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        type={type === 'income' ? 'income' : 'expense'}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onCreateNew={() => setCategoryQuickCreateOpen(true)}
        allowNone={false}
      />
      <AccountPicker
        visible={accountPickerOpen}
        onClose={() => setAccountPickerOpen(false)}
        title={type === 'transfer' ? 'Cuenta origen' : 'Cuenta'}
        selectedId={fromId}
        onSelect={setFrom}
      />
      <AccountPicker
        visible={toAccountPickerOpen}
        onClose={() => setToAccountPickerOpen(false)}
        title="Cuenta destino"
        selectedId={toId}
        onSelect={setTo}
        excludeId={fromId}
      />
      <MultiSelectSheet
        visible={tagPickerOpen}
        onClose={() => setTagPickerOpen(false)}
        title="Tags"
        options={tagOptions}
        values={tagIds}
        onChange={setTagIds}
        onCreateNew={() => setTagQuickCreateOpen(true)}
      />
      <CategoryQuickCreateSheet
        visible={categoryQuickCreateOpen}
        onClose={() => setCategoryQuickCreateOpen(false)}
        type={type === 'income' ? 'income' : 'expense'}
        onCreated={(id) => {
          setCategoryId(id);
          setCategoryQuickCreateOpen(false);
          setPickerOpen(false);
        }}
      />
      <TagQuickCreateSheet
        visible={tagQuickCreateOpen}
        onClose={() => setTagQuickCreateOpen(false)}
        onCreated={(id) => {
          setTagIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
          setTagQuickCreateOpen(false);
        }}
      />
      <DiscardConfirmSheet
        visible={confirmCancel}
        onKeep={() => setConfirmCancel(false)}
        onDiscard={onCancel}
      />
    </Screen>
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
