import { Ionicons } from '@expo/vector-icons';
import type { TransactionType } from '@repo/core/types';
import { BottomSheet } from '@repo/ui';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { DateRangeField } from './date-range-field';
import { FilterOptionSheet, type FilterOption } from './filter-option-sheet';
import { MultiSelectSheet } from './multi-select-sheet';

const TITLE: Record<TransactionType, string> = {
  income: 'Ingresos',
  expense: 'Gastos',
  transfer: 'Transferencias',
};

const TYPE_OPTIONS = [
  { value: 'income', label: 'Ingresos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'transfer', label: 'Transferencias' },
];

function pluralLabel(count: number, noun: string, pluralNoun: string): string {
  return `${count} ${count === 1 ? noun : pluralNoun} seleccionada${count === 1 ? '' : 's'}`;
}

/** Roomier row than the shared `ListRow` — this sheet only ever holds four of these. */
function FilterRow({
  title,
  value,
  onPress,
}: {
  title: string;
  value: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-5 active:opacity-60"
    >
      <Text className="flex-1 text-base font-semibold text-ink dark:text-ink-dark">{title}</Text>
      <Text className="text-[15px] text-ink-2 dark:text-ink-2-dark">{value}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </Pressable>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;

  type: TransactionType | null;
  onTypeChange: (type: TransactionType | null) => void;

  categoryIds: string[];
  onCategoryIdsChange: (ids: string[]) => void;
  categoryOptions: FilterOption[];

  accountIds: string[];
  onAccountIdsChange: (ids: string[]) => void;
  accountOptions: FilterOption[];

  from: string | null;
  to: string | null;
  onDateChange: (from: string | null, to: string | null) => void;

  filtered: boolean;
  onClearAll: () => void;
}

/**
 * Full filters view: every filter dimension as a row in one sheet, opened
 * from the funnel button so the list screen itself stays uncluttered.
 */
export function FiltersSheet({
  visible,
  onClose,
  type,
  onTypeChange,
  categoryIds,
  onCategoryIdsChange,
  categoryOptions,
  accountIds,
  onAccountIdsChange,
  accountOptions,
  from,
  to,
  onDateChange,
  filtered,
  onClearAll,
}: Props) {
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);

  const categoryLabel =
    categoryIds.length === 0
      ? 'Todas las categorías'
      : pluralLabel(categoryIds.length, 'categoría', 'categorías');
  const accountLabel =
    accountIds.length === 0 ? 'Todas las cuentas' : pluralLabel(accountIds.length, 'cuenta', 'cuentas');

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title="Filtros"
        headerAction={
          filtered ? (
            <Pressable onPress={onClearAll} hitSlop={8}>
              <Text className="text-[13px] font-semibold text-danger dark:text-danger-dark">
                Limpiar
              </Text>
            </Pressable>
          ) : undefined
        }
      >
        <View className="divide-y divide-line px-5 pb-10 pt-1 dark:divide-line-dark">
          <FilterRow
            title="Tipo"
            value={type ? TITLE[type] : 'Todos'}
            onPress={() => setTypeSheetOpen(true)}
          />
          <FilterRow
            title="Categoría"
            value={categoryLabel}
            onPress={() => setCategorySheetOpen(true)}
          />
          <FilterRow
            title="Cuenta"
            value={accountLabel}
            onPress={() => setAccountSheetOpen(true)}
          />
          <DateRangeField
            from={from}
            to={to}
            onChange={onDateChange}
            renderTrigger={({ label, onPress }) => (
              <FilterRow title="Fecha" value={label} onPress={onPress} />
            )}
          />
        </View>
      </BottomSheet>

      <FilterOptionSheet
        visible={typeSheetOpen}
        onClose={() => setTypeSheetOpen(false)}
        title="Tipo de movimiento"
        allLabel="Todos los tipos"
        options={TYPE_OPTIONS}
        value={type}
        onSelect={(v) => onTypeChange(v as TransactionType | null)}
      />
      <MultiSelectSheet
        visible={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        title="Categoría"
        options={categoryOptions}
        values={categoryIds}
        onChange={onCategoryIdsChange}
      />
      <MultiSelectSheet
        visible={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        title="Cuenta"
        options={accountOptions}
        values={accountIds}
        onChange={onAccountIdsChange}
      />
    </>
  );
}
