import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useCategories } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionType } from '@repo/core/types';
import {
  favoriteTransactionCreateSchema,
  type FavoriteTransactionCreateInput,
} from '@repo/core/validators';
import {
  Button,
  CategoryDot,
  CurrencyField,
  ErrorCard,
  SegmentedControl,
  SwitchRow,
  TextField,
  ICON_COLORS,
} from '@repo/ui';
import { ArrowLeftRight, CircleArrowDown, CircleArrowUp } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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

const TYPE_ICONS = [
  { value: 'expense' as const, icon: CircleArrowUp },
  { value: 'income' as const, icon: CircleArrowDown },
  { value: 'transfer' as const, icon: ArrowLeftRight },
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
  const { t } = useTranslation(['favorites', 'transactions']);
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
    if (!label.trim()) return setFieldError('favorites:form.nameRequired');
    if (!icon) return setFieldError('favorites:form.iconRequired');
    if (!accountId) return setFieldError('transactions:form.pickAccount');

    let amount: number | null = null;
    if (fixedAmount) {
      amount = Number(amountText.replace(',', '.'));
      if (!Number.isFinite(amount) || amount <= 0) {
        return setFieldError('transactions:form.amountPositive');
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
          ? 'transactions:form.pickTarget'
          : (parsed.error.issues[0]?.message ?? 'transactions:form.checkData'),
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
            color={ICON_COLORS.limeInk}
          />
        </Pressable>
        <Pressable onPress={() => setIconPickerOpen(true)} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            {t(icon ? 'form.changeIcon' : 'form.pickIcon')}
          </Text>
        </Pressable>
      </View>

      <TextField
        label={t('form.name')}
        value={label}
        onChangeText={(text) => {
          setLabel(text);
          dirty();
        }}
        placeholder={t('form.namePlaceholder')}
        maxLength={40}
      />

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
          {t('transactions:form.typeLabel')}
        </Text>
        <SegmentedControl
          options={TYPE_ICONS.map((o) => ({ ...o, label: t(`transactions:form.type.${o.value}`) }))}
          value={type}
          onChange={changeType}
        />
      </View>

      <Field
        label={t(type === 'transfer' ? 'transactions:form.from' : 'transactions:form.account')}
      >
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
          <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            {t('transactions:form.seeAll')}
          </Text>
        </Pressable>
      </Field>

      {type === 'transfer' ? (
        <Field label={t('transactions:form.to')}>
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
              {selectedToAccount ? selectedToAccount.name : t('transactions:form.pickAccount')}
            </Text>
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              {t('transactions:form.seeAll')}
            </Text>
          </Pressable>
        </Field>
      ) : (
        <Field label={t('transactions:form.category')}>
          <Pressable
            onPress={() => setCategoryPickerOpen(true)}
            className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
          >
            <View className="flex-row items-center gap-2">
              {selectedCategory ? (
                <CategoryDot
                  color={selectedCategory.color}
                  icon={selectedCategory.icon}
                  size={16}
                />
              ) : null}
              <Text
                className={
                  selectedCategory
                    ? 'text-base text-ink dark:text-ink-dark'
                    : 'text-base text-ink-3 dark:text-ink-3-dark'
                }
              >
                {selectedCategory
                  ? resolveCategoryLabel(selectedCategory)
                  : t('transactions:form.pickCategory')}
              </Text>
            </View>
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              {t('transactions:form.seeAll')}
            </Text>
          </Pressable>
        </Field>
      )}

      <SwitchRow
        label={t('form.fixedAmount')}
        description={fixedAmount ? t('form.fixedOn') : t('form.fixedOff')}
        value={fixedAmount}
        onValueChange={(v) => {
          setFixedAmount(v);
          dirty();
        }}
      />

      {fixedAmount ? (
        <CurrencyField
          label={t('transactions:form.amount')}
          value={amountText}
          onChangeText={(text) => {
            setAmountText(text);
            dirty();
          }}
          currency={selectedAccount?.currency ?? 'MXN'}
        />
      ) : null}

      <TextField
        label={t('transactions:form.description')}
        value={description}
        onChangeText={(text) => {
          setDescription(text);
          dirty();
        }}
        placeholder={t('transactions:form.descriptionPlaceholder')}
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
        title={t(
          type === 'transfer' ? 'transactions:form.fromAccount' : 'transactions:form.account',
        )}
        selectedId={accountId}
        onSelect={(id) => {
          setPickedAccount(id);
          dirty();
        }}
      />
      <AccountPicker
        visible={toAccountPickerOpen}
        onClose={() => setToAccountPickerOpen(false)}
        title={t('transactions:form.toAccount')}
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
