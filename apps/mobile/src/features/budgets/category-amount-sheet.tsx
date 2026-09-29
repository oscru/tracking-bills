import { resolveCategoryLabel } from '@repo/core/i18n';
import type { Category } from '@repo/core/types';
import { formatCurrency } from '@repo/core/utils';
import { BottomSheet, Button, CategoryDot, TextField } from '@repo/ui';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

interface Props {
  visible: boolean;
  category: Category | null;
  /** Pre-fills the field when editing an already-added category's amount. */
  initialAmount?: number | null;
  /** How much of the total is still unallocated — powers the "Usar el restante" shortcut. */
  remaining: number;
  currency: string;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}

/** Prompts for how much of the budget's locked total a just-picked (or
 * already-added) category gets — including a one-tap "usar el restante"
 * shortcut for whatever's left unassigned. */
export function CategoryAmountSheet({
  visible,
  category,
  initialAmount,
  remaining,
  currency,
  onClose,
  onConfirm,
}: Props) {
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset the field each time the sheet opens — read during render (not an
  // effect) so it happens before the first paint, avoiding a stale-value flash.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setAmountText(initialAmount != null ? String(initialAmount) : '');
      setError(null);
    }
  }

  const confirm = () => {
    const amount = Number(amountText.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    onConfirm(amount);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Asignar monto">
      <View className="gap-4 px-5 pb-8">
        {category ? (
          <View className="flex-row items-center gap-2">
            <CategoryDot color={category.color} icon={category.icon} size={18} />
            <Text className="text-base font-semibold text-ink dark:text-ink-dark">
              {resolveCategoryLabel(category)}
            </Text>
          </View>
        ) : null}

        <TextField
          label="Monto asignado"
          value={amountText}
          onChangeText={(t) => {
            setAmountText(t);
            setError(null);
          }}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={error}
          autoFocus
        />

        {remaining > 0 ? (
          <Pressable onPress={() => setAmountText(String(remaining))} hitSlop={8}>
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              Usar el restante ({formatCurrency(remaining, currency)})
            </Text>
          </Pressable>
        ) : null}

        <Button label="Guardar" onPress={confirm} />
      </View>
    </BottomSheet>
  );
}
