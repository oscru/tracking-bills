import { Ionicons } from '@expo/vector-icons';
import { useCategories } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import { formatCurrency } from '@repo/core/utils';
import { CategoryDot } from '@repo/ui';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CategoryPicker } from '../categories/category-picker';
import { CategoryAmountSheet } from './category-amount-sheet';

export interface CategoryAllocation {
  categoryId: string;
  amount: number;
}

interface Props {
  categories: CategoryAllocation[];
  onChange: (categories: CategoryAllocation[]) => void;
  /** The budget's total amount — what "restante" is measured against. */
  totalAmount: number;
  currency: string;
}

/** The categories a budget covers, each with its own share of the total —
 * add one at a time (picking the category, then its amount), tap an existing
 * one to change its amount, remove any of them. Tracks how much of the total
 * is still unassigned, and flags (without blocking) going more than 10% over. */
export function BudgetCategoriesEditor({ categories, onChange, totalAmount, currency }: Props) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const { data: allCategories } = useCategories();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [amountSheetOpen, setAmountSheetOpen] = useState(false);

  const chosen = categories
    .map((c) => ({ allocation: c, category: (allCategories ?? []).find((cat) => cat.id === c.categoryId) }))
    .filter((c): c is { allocation: CategoryAllocation; category: NonNullable<typeof c.category> } => c.category != null);

  const allocatedSum = categories.reduce((sum, c) => sum + c.amount, 0);
  const remaining = totalAmount - allocatedSum;
  const overBy = allocatedSum - totalAmount;
  const tolerance = totalAmount * 0.1;
  const overTolerance = overBy > tolerance;

  const remainingColor = remaining >= 0 ? 'text-pos dark:text-pos-dark' : overTolerance ? 'text-danger dark:text-danger-dark' : 'text-warning dark:text-warning-dark';

  const editingCategory = editingCategoryId
    ? (allCategories ?? []).find((c) => c.id === editingCategoryId)
    : null;
  const editingAmount = editingCategoryId
    ? (categories.find((c) => c.categoryId === editingCategoryId)?.amount ?? null)
    : null;
  // Editing an already-added category: "restante" should still count its own current amount as available.
  const remainingForSheet = editingCategoryId ? remaining + (editingAmount ?? 0) : remaining;

  const remove = (categoryId: string) => onChange(categories.filter((c) => c.categoryId !== categoryId));

  const startAdd = (categoryId: string) => {
    setEditingCategoryId(categoryId);
    setAmountSheetOpen(true);
  };

  const startEdit = (categoryId: string) => {
    setEditingCategoryId(categoryId);
    setAmountSheetOpen(true);
  };

  const confirmAmount = (amount: number) => {
    if (!editingCategoryId) return;
    const exists = categories.some((c) => c.categoryId === editingCategoryId);
    onChange(
      exists
        ? categories.map((c) => (c.categoryId === editingCategoryId ? { ...c, amount } : c))
        : [...categories, { categoryId: editingCategoryId, amount }],
    );
    setAmountSheetOpen(false);
    setEditingCategoryId(null);
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between rounded-2xl bg-surface p-4 dark:bg-surface-dark">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Restante por repartir</Text>
        <Text className={`text-base font-bold ${remainingColor}`}>{formatCurrency(remaining, currency)}</Text>
      </View>

      {overTolerance ? (
        <View className="rounded-xl bg-warning-tint p-3.5 dark:bg-warning-tint-dark">
          <Text className="text-xs leading-[17px] text-warning dark:text-warning-dark">
            Repartiste {formatCurrency(overBy, currency)} más de tu presupuesto de{' '}
            {formatCurrency(totalAmount, currency)} — más del 10% de tolerancia. Puedes crearlo así, pero
            considera ajustar los montos.
          </Text>
        </View>
      ) : null}

      {chosen.length === 0 ? (
        <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
          Sin categorías todavía. Añade al menos una.
        </Text>
      ) : (
        <View className="rounded-2xl border border-line dark:border-line-dark">
          {chosen.map(({ allocation, category: c }, i) => (
            <Pressable
              key={c.id}
              onPress={() => startEdit(c.id)}
              className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-60 ${
                i > 0 ? 'border-t border-line dark:border-line-dark' : ''
              }`}
            >
              <CategoryDot color={c.color} icon={c.icon} size={16} />
              <Text className="flex-1 text-[15px] text-ink dark:text-ink-dark" numberOfLines={1}>
                {resolveCategoryLabel(c)}
              </Text>
              <Text className="text-[15px] font-semibold text-ink dark:text-ink-dark">
                {formatCurrency(allocation.amount, currency)}
              </Text>
              <Pressable onPress={() => remove(c.id)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={dark ? '#6B7178' : '#9CA3AF'} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => setPickerOpen(true)}
        className="h-12 flex-row items-center justify-center gap-1.5 rounded-ctl border border-dashed border-line dark:border-line-dark"
      >
        <Ionicons name="add" size={18} color="#4D7C0F" />
        <Text className="text-[14px] font-semibold text-lime-ink dark:text-lime-ink-dark">
          Añadir categoría
        </Text>
      </Pressable>

      <CategoryPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        type="expense"
        selectedId={null}
        excludeIds={categories.map((c) => c.categoryId)}
        allowNone={false}
        onSelect={(id) => {
          if (id) startAdd(id);
        }}
      />

      <CategoryAmountSheet
        visible={amountSheetOpen}
        category={editingCategory ?? null}
        initialAmount={editingAmount}
        remaining={remainingForSheet}
        currency={currency}
        onClose={() => {
          setAmountSheetOpen(false);
          setEditingCategoryId(null);
        }}
        onConfirm={confirmAmount}
      />
    </View>
  );
}
