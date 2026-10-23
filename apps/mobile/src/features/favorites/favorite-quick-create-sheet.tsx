import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useCreateFavoriteTransaction, useFormError } from '@repo/core/hooks';
import { favoriteTransactionCreateSchema } from '@repo/core/validators';
import {
  BottomSheet,
  Button,
  CurrencyField,
  ErrorCard,
  SwitchRow,
  TextField,
  ICON_COLORS,
} from '@repo/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { FavoriteFormInitial } from './favorite-form';
import { IconPicker } from './icon-picker';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** The in-progress movement's type/account/category/to-account/description —
   * copied straight into the favorite, never shown here (they're already
   * decided by the movement being created). */
  initial: FavoriteFormInitial;
  onCreated: () => void;
}

/**
 * Minimal "save as favorite" sheet reachable from the ♥ inside `MovementForm`.
 * Unlike the full `FavoriteForm` (used from the Favoritos screen, where none
 * of this is decided yet), it doesn't re-ask for type/account/category/
 * description — only a name, an icon, and an optional fixed amount.
 */
export function FavoriteQuickCreateSheet({ visible, onClose, initial, onCreated }: Props) {
  const { t } = useTranslation('favorites');
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('form.saveAsTitle')}
      dismissKeyboardOnOpen={false}
    >
      <QuickFavoriteFields
        key={visible ? 'open' : 'closed'}
        initial={initial}
        onCreated={onCreated}
      />
    </BottomSheet>
  );
}

function QuickFavoriteFields({
  initial,
  onCreated,
}: {
  initial: FavoriteFormInitial;
  onCreated: () => void;
}) {
  const { t } = useTranslation(['favorites', 'transactions', 'common']);
  const create = useCreateFavoriteTransaction();
  const { data: accounts } = useAccounts();
  const { error, setError, clearError } = useFormError();
  const currency = (accounts ?? []).find((a) => a.id === initial.account_id)?.currency ?? 'MXN';

  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [fixedAmount, setFixedAmount] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const dirty = () => {
    setFieldError(null);
    clearError();
  };

  const submit = () => {
    dirty();
    if (!label.trim()) return setFieldError('favorites:form.nameRequired');
    if (!icon) return setFieldError('favorites:form.iconRequired');

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
      account_id: initial.account_id ?? '',
      amount,
      description: initial.description ?? null,
    };
    const payload =
      initial.type === 'transfer'
        ? { ...common, type: 'transfer' as const, to_account_id: initial.to_account_id ?? '' }
        : { ...common, type: initial.type ?? 'expense', category_id: initial.category_id ?? null };

    const parsed = favoriteTransactionCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'transactions:form.checkData');
      return;
    }

    create.mutate(parsed.data, {
      onSuccess: () => onCreated(),
      onError: (e) => setError(e, t('saveFailed')),
    });
  };

  return (
    <View className="gap-5 px-5 pb-8 pt-1">
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
        autoFocus
      />

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
          currency={currency}
        />
      ) : null}

      <ErrorCard message={fieldError ?? error} />

      <Button label={t('common:save')} onPress={submit} loading={create.isPending} />

      <IconPicker
        visible={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        value={icon}
        onSelect={(name) => {
          setIcon(name);
          dirty();
        }}
      />
    </View>
  );
}
