import type { TransactionType } from '@repo/core/types';
import { BottomSheet, ICON_COLORS } from '@repo/ui';
import { ChevronRight } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { DateRangeField } from './date-range-field';
import { FilterOptionSheet, type FilterOption } from './filter-option-sheet';
import { MultiSelectSheet } from './multi-select-sheet';

const TYPES: TransactionType[] = ['income', 'expense', 'transfer'];

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
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-5 active:opacity-60">
      <Text className="flex-1 text-base font-semibold text-ink dark:text-ink-dark">{title}</Text>
      <Text className="text-[15px] text-ink-2 dark:text-ink-2-dark">{value}</Text>
      <ChevronRight size={18} color={ICON_COLORS.ink3} />
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

  tagIds: string[];
  onTagIdsChange: (ids: string[]) => void;
  tagOptions: FilterOption[];

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
  tagIds,
  onTagIdsChange,
  tagOptions,
  from,
  to,
  onDateChange,
  filtered,
  onClearAll,
}: Props) {
  const { t } = useTranslation(['transactions', 'common']);
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);

  const typeOptions = TYPES.map((value) => ({ value, label: t(`types.${value}`) }));
  const categoryLabel =
    categoryIds.length === 0
      ? t('filters.allCategories')
      : t('filters.categoriesSelected', { count: categoryIds.length });
  const accountLabel =
    accountIds.length === 0
      ? t('filters.allAccounts')
      : t('filters.accountsSelected', { count: accountIds.length });
  const tagLabel =
    tagIds.length === 0
      ? t('filters.allTags')
      : t('filters.tagsSelected', { count: tagIds.length });

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={t('filters.title')}
        headerAction={
          filtered ? (
            <Pressable onPress={onClearAll} hitSlop={8}>
              <Text className="text-[13px] font-semibold text-danger dark:text-danger-dark">
                {t('filters.clear')}
              </Text>
            </Pressable>
          ) : undefined
        }
      >
        <View className="divide-y divide-line px-5 pb-10 pt-1 dark:divide-line-dark">
          <FilterRow
            title={t('filters.type')}
            value={type ? t(`types.${type}`) : t('common:all')}
            onPress={() => setTypeSheetOpen(true)}
          />
          <FilterRow
            title={t('filters.category')}
            value={categoryLabel}
            onPress={() => setCategorySheetOpen(true)}
          />
          <FilterRow
            title={t('filters.account')}
            value={accountLabel}
            onPress={() => setAccountSheetOpen(true)}
          />
          <FilterRow
            title={t('filters.tag')}
            value={tagLabel}
            onPress={() => setTagSheetOpen(true)}
          />
          <DateRangeField
            from={from}
            to={to}
            onChange={onDateChange}
            renderTrigger={({ label, onPress }) => (
              <FilterRow title={t('filters.date')} value={label} onPress={onPress} />
            )}
          />
        </View>
      </BottomSheet>

      <FilterOptionSheet
        visible={typeSheetOpen}
        onClose={() => setTypeSheetOpen(false)}
        title={t('filters.typeTitle')}
        allLabel={t('filters.allTypes')}
        options={typeOptions}
        value={type}
        onSelect={(v) => onTypeChange(v as TransactionType | null)}
      />
      <MultiSelectSheet
        visible={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        title={t('filters.category')}
        options={categoryOptions}
        values={categoryIds}
        onChange={onCategoryIdsChange}
      />
      <MultiSelectSheet
        visible={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        title={t('filters.account')}
        options={accountOptions}
        values={accountIds}
        onChange={onAccountIdsChange}
      />
      <MultiSelectSheet
        visible={tagSheetOpen}
        onClose={() => setTagSheetOpen(false)}
        title={t('filters.tag')}
        options={tagOptions}
        values={tagIds}
        onChange={onTagIdsChange}
      />
    </>
  );
}
