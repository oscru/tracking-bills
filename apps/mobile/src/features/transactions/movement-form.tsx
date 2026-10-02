import {
  useAccounts,
  useCategories,
  useFavoriteTransactions,
  useProfile,
  useRecordFavoriteTransactionUse,
  useTags,
} from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { FavoriteTransactionWithRefs } from '@repo/core/supabase';
import type { TransactionType } from '@repo/core/types';
import {
  applyAmountKey,
  evalAmount,
  formatCurrency,
  todayISODate,
  topFavorites,
} from '@repo/core/utils';
import { transactionCreateSchema, type TransactionCreateInput } from '@repo/core/validators';
import {
  AmountDisplay,
  Button,
  CategoryDot,
  Chip,
  ErrorCard,
  IconButton,
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
import { favoriteTint } from '../favorites/favorite-colors';
import type { FavoriteFormInitial } from '../favorites/favorite-form';
import { FavoriteQuickCreateSheet } from '../favorites/favorite-quick-create-sheet';
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
  /** A transfer's destination can be a goal instead of an account — see `goalName`. */
  goal_id?: string | null;
  /** Display name for `goal_id`, since this form never loads the full goals list. */
  goalName?: string | null;
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
  const { data: profile } = useProfile();
  const { data: favorites } = useFavoriteTransactions();
  const recordFavoriteUse = useRecordFavoriteTransactionUse();
  const activeAccounts = useMemo(() => (accounts ?? []).filter((a) => !a.archived), [accounts]);
  // The calculator's quick-fill pills, in place of the plain account chips,
  // for the type they're actually saved under (favorites don't apply to the
  // other types the way a source account always does).
  const favoriteExpenses = useMemo(
    () => topFavorites(favorites ?? [], { type: 'expense' }),
    [favorites],
  );

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
  // A transfer aimed at a goal instead of an account (see `add-contribution-sheet.tsx`
  // for how those get created). This form has no UI to *pick* a goal — it only
  // preserves one already on the transaction being edited, clearing it the moment
  // the user picks a destination account instead (see the "A" `AccountPicker` below).
  const [goalId, setGoalId] = useState<string | null>(initial?.goal_id ?? null);
  const [goalName] = useState<string | null>(initial?.goalName ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(
    draft?.categoryId ?? initial?.category_id ?? null,
  );
  // Travel mode: a brand-new movement (not a restored minimized draft, not an
  // edit) defaults to the trip tag, same as if the user had picked it by
  // hand — seeded once at mount, same as `draft`/`initial` just above.
  const [tagIds, setTagIds] = useState<string[]>(() => {
    const base = draft?.tagIds ?? initial?.tags ?? [];
    const tripTagId = mode === 'create' && !draft && profile?.travel_mode ? profile.travel_trip_tag_id : null;
    return tripTagId && !base.includes(tripTagId) ? [...base, tripTagId] : base;
  });
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
  // Whether ♥ is armed — just an intent flag, checked at `submit()` time
  // rather than opening the favorite sheet on tap. Tapping ♥ mid-form (e.g.
  // from the amount step, before a category is even picked) has nothing
  // valid to build a favorite from yet; deferring to submit means the sheet
  // only ever opens once `transactionCreateSchema` has already accepted the
  // movement, so it's built from confirmed data instead of a half-filled draft.
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  // The validated movement, held here while the favorite sheet (if armed) is
  // open — `onSubmit` doesn't fire until that sheet is resolved either way.
  const [pendingSubmit, setPendingSubmit] = useState<TransactionCreateInput | null>(null);

  const fromId = pickedFrom ?? activeAccounts[0]?.id ?? null;
  const toId = pickedTo;
  const currency = activeAccounts.find((a) => a.id === fromId)?.currency ?? 'MXN';
  // A future date can't have already happened — the effective "Completada"
  // is forced off (and its switch disabled) whenever the date is pushed past
  // today, without discarding whatever the user had it set to otherwise.
  const isFutureDate = date > todayISODate();
  const effectiveCompleted = isFutureDate ? false : isCompleted;

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

  // What "Guardar como favorito" prefills — everything a favorite needs
  // except its own name/icon, which this movement doesn't carry. Amount is
  // deliberately left out: defaulting a new favorite to today's exact amount
  // would make "monto libre" the exception instead of the norm.
  const favoriteInitial: FavoriteFormInitial =
    type === 'transfer'
      ? { type, account_id: fromId, to_account_id: toId, description: description.trim() || null }
      : { type, account_id: fromId, category_id: categoryId, description: description.trim() || null };

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
    effectiveCompleted !== (initial?.is_completed ?? true);

  const onKey = (k: KeypadKey) => setAmount((prev) => applyAmountKey(prev, k));

  const changeType = (next: TransactionType) => {
    setType(next);
    // A category belongs to exactly one type (`categories.type`) — income,
    // expense, and "no category at all" (transfer) each have their own,
    // disjoint set. Keeping whatever was picked for the old type across a
    // switch leaves a stale selection the DB will reject on save (or, for
    // income<->expense, one the Categoría field keeps showing as "selected"
    // even though it no longer belongs to the list being shown).
    setCategoryId(null);
    if (next !== 'transfer') {
      setTo(null);
      setGoalId(null);
    }
  };

  // Changing the source account can leave a picked destination account in a
  // different currency — this app has no exchange rate to convert through,
  // so a mismatched destination is cleared rather than left silently wrong.
  // A goal destination is cleared on any source change at all: it was tied
  // to this exact source account's currency when first picked (see
  // `AddContributionSheet`), and this form has no way to re-verify that
  // without fetching the full goals list just for this one check.
  const selectFrom = (id: string) => {
    setFrom(id);
    const nextCurrency = activeAccounts.find((a) => a.id === id)?.currency;
    if (selectedToAccount && selectedToAccount.currency !== nextCurrency) setTo(null);
    if (goalId) setGoalId(null);
  };

  // Quick-fills the account/category/description/amount a favorite carries —
  // a fixed amount always overwrites whatever's currently typed, same as
  // tapping a favorite from the stories row does. "Monto libre" favorites
  // (no fixed amount) leave the field as-is instead of clearing it.
  const applyFavorite = (f: FavoriteTransactionWithRefs) => {
    recordFavoriteUse.mutate(f.id);
    setFrom(f.account_id);
    setCategoryId(f.category_id);
    if (f.description) setDescription(f.description);
    if (f.amount != null) setAmount(String(f.amount));
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
      is_completed: effectiveCompleted,
    };
    const payload =
      type === 'transfer'
        ? toId
          ? { ...common, type: 'transfer' as const, to_account_id: toId }
          : { ...common, type: 'transfer' as const, goal_id: goalId ?? '' }
        : { ...common, type, category_id: categoryId };

    const parsed = transactionCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError(
        type === 'transfer' && !toId && !goalId
          ? 'Elige la cuenta destino'
          : (parsed.error.issues[0]?.message ?? 'Revisa los datos'),
      );
      return;
    }
    if (saveAsFavorite) {
      // Detour through naming the favorite first — `finishSubmit` (wired to
      // the sheet's `onClose`/`onCreated`) carries this the rest of the way.
      setPendingSubmit(parsed.data);
      return;
    }
    onSubmit(parsed.data, tagIds);
  };

  // Resolves the ♥ detour either way — favorite created or the sheet just
  // dismissed — by finally submitting the movement that was already validated.
  const finishSubmit = () => {
    if (pendingSubmit) onSubmit(pendingSubmit, tagIds);
    setPendingSubmit(null);
    setSaveAsFavorite(false);
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
      <Screen className="gap-3">
        <View className="flex-row items-center gap-3">
          <IconButton icon="close" onPress={tryCancel} accessibilityLabel="Cancelar" />
          <Text className="flex-1 text-xl font-bold text-ink dark:text-ink-dark">
            {mode === 'create' ? 'Nuevo movimiento' : 'Editar movimiento'}
          </Text>
          <IconButton
            icon={saveAsFavorite ? 'heart' : 'heart-outline'}
            onPress={() => setSaveAsFavorite((v) => !v)}
            accessibilityLabel={
              saveAsFavorite ? 'No guardar como favorito' : 'Guardar como favorito'
            }
          />
          {onMinimize ? (
            <IconButton icon="remove" onPress={minimize} accessibilityLabel="Minimizar" />
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
          {type === 'expense' && favoriteExpenses.length > 0
            ? favoriteExpenses.map((f) => {
                const { fg } = favoriteTint(f);
                return (
                  <Chip
                    key={f.id}
                    label={f.label}
                    icon={f.icon}
                    dotColor={fg}
                    selected={fromId === f.account_id && categoryId === f.category_id}
                    onPress={() => applyFavorite(f)}
                  />
                );
              })
            : activeAccounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  selected={fromId === a.id}
                  onPress={() => selectFrom(a.id)}
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
        <FavoriteQuickCreateSheet
          visible={pendingSubmit != null}
          onClose={finishSubmit}
          initial={favoriteInitial}
          onCreated={finishSubmit}
        />
      </Screen>
    );
  }

  // --- details step ---
  return (
    <Screen edges={['top']} className="gap-4">
      <View className="flex-row items-center gap-3">
        <IconButton icon="close" onPress={tryCancel} accessibilityLabel="Cancelar" />
        <Text className="flex-1 text-xl font-bold text-ink dark:text-ink-dark">
          {mode === 'create' ? 'Nuevo movimiento' : 'Editar movimiento'}
        </Text>
        <IconButton
          icon={saveAsFavorite ? 'heart' : 'heart-outline'}
          onPress={() => setSaveAsFavorite((v) => !v)}
          accessibilityLabel={saveAsFavorite ? 'No guardar como favorito' : 'Guardar como favorito'}
        />
        {onMinimize ? (
          <IconButton icon="remove" onPress={minimize} accessibilityLabel="Minimizar" />
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
                <Text
                  className={
                    selectedToAccount || goalId
                      ? 'text-base text-ink dark:text-ink-dark'
                      : 'text-base text-ink-3 dark:text-ink-3-dark'
                  }
                >
                  {selectedToAccount
                    ? selectedToAccount.name
                    : goalId
                      ? `Aportación a “${goalName ?? 'tu meta'}”`
                      : 'Elige una cuenta'}
                </Text>
                <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
                  Ver todas ›
                </Text>
              </Pressable>
            </Field>
            <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
              {goalId && !selectedToAccount
                ? 'Esta transferencia va hacia una meta de ahorro, no a otra cuenta — elige una cuenta aquí si quieres redirigirla.'
                : selectedFromAccount
                  ? `No cuenta como ingreso ni gasto — solo mueve saldo entre tus cuentas en ${selectedFromAccount.currency} (esta app no convierte divisas).`
                  : 'No cuenta como ingreso ni gasto — solo mueve saldo entre tus cuentas.'}
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
                    <CategoryDot color={selectedCategory.color} icon={selectedCategory.icon} size={16} />
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
          {profile?.travel_mode && profile.travel_trip_tag_id && tagIds.includes(profile.travel_trip_tag_id) ? (
            <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
              Se añadió la tag de tu viaje automáticamente — modo viaje está activo.
            </Text>
          ) : null}
        </Field>

        <TextField
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción"
        />

        <SwitchRow
          label="Completada"
          description={
            isFutureDate
              ? 'No puede estar completada — la fecha es futura'
              : effectiveCompleted
                ? 'Ya se realizó'
                : 'Pendiente por realizarse'
          }
          value={effectiveCompleted}
          onValueChange={setIsCompleted}
          disabled={isFutureDate}
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
        onSelect={selectFrom}
      />
      <AccountPicker
        visible={toAccountPickerOpen}
        onClose={() => setToAccountPickerOpen(false)}
        title="Cuenta destino"
        selectedId={toId}
        onSelect={(id) => {
          setTo(id);
          setGoalId(null);
        }}
        excludeId={fromId}
        currencyFilter={selectedFromAccount?.currency ?? null}
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
      <FavoriteQuickCreateSheet
        visible={pendingSubmit != null}
        onClose={finishSubmit}
        initial={favoriteInitial}
        onCreated={finishSubmit}
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
