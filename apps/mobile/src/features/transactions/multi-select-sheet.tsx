import { BottomSheet, CategoryDot, ICON_COLORS } from '@repo/ui';
import { Check, Plus } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

export interface MultiSelectOption {
  value: string;
  label: string;
  dotColor?: string | null;
  icon?: string | null;
  /** Custom leading element (e.g. an account's icon tile) — replaces the dot/icon. */
  leading?: ReactNode;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  /** Shows a create row in the list; called with the searched text when it
   * matched no option exactly, to prefill the new item's name. */
  onCreateNew?: (name?: string) => void;
  /** The create row's label when nothing is typed, e.g. "Nueva tag". */
  createLabel?: string;
  /** Adds a search field with this placeholder. */
  searchPlaceholder?: string;
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View
      className={`h-5 w-5 items-center justify-center rounded-[6px] border-2 ${
        checked ? 'border-lime bg-lime' : 'border-line dark:border-line-dark'
      }`}
    >
      {checked ? <Check size={14} color={ICON_COLORS.ink} /> : null}
    </View>
  );
}

/** Reusable multi-select list sheet: "Seleccionar todo" + a checkbox per option. */
export function MultiSelectSheet({
  visible,
  onClose,
  title,
  options,
  values,
  onChange,
  onCreateNew,
  createLabel,
  searchPlaceholder,
}: Props) {
  const { t } = useTranslation(['transactions', 'common']);
  const [q, setQ] = useState('');
  const typed = q.trim();
  const needle = typed.toLowerCase();
  const visibleOptions = needle
    ? options.filter((o) => o.label.toLowerCase().includes(needle))
    : options;
  const exactMatch = needle !== '' && options.some((o) => o.label.toLowerCase() === needle);
  const allSelected = options.length > 0 && values.length === options.length;

  const createNew = () => {
    setQ('');
    onCreateNew?.(typed || undefined);
  };

  const toggleAll = () => {
    onChange(allSelected ? [] : options.map((o) => o.value));
  };
  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      headerAction={
        <Pressable onPress={onClose} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            {t('common:done')}
          </Text>
        </Pressable>
      }
    >
      {searchPlaceholder ? (
        <View className="px-5 pb-3">
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={searchPlaceholder}
            placeholderTextColor={ICON_COLORS.ink3}
            autoCorrect={false}
            className="h-11 rounded-ctl border border-line bg-surface px-3 text-[15px] text-ink dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark"
          />
        </View>
      ) : null}

      <ScrollView
        className="max-h-[480px]"
        contentContainerClassName="pb-4"
        keyboardShouldPersistTaps="handled"
      >
        {onCreateNew && !exactMatch ? (
          <Pressable
            onPress={createNew}
            accessibilityRole="button"
            className="min-h-[56px] flex-row items-center gap-3 border-t border-line px-5 active:opacity-70 dark:border-line-dark"
          >
            <View className="h-7 w-7 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
              <Plus size={16} color={ICON_COLORS.limeInk} strokeWidth={2.5} />
            </View>
            <Text
              className="flex-1 text-[15px] font-semibold text-lime-ink dark:text-lime-ink-dark"
              numberOfLines={1}
            >
              {typed
                ? t('multiSelect.createTyped', { name: typed })
                : (createLabel ?? t('multiSelect.createNew'))}
            </Text>
          </Pressable>
        ) : null}

        {/* Hidden while searching — "todo" would mean only the filtered few. */}
        {typed ? null : (
          <Pressable
            onPress={toggleAll}
            className="min-h-[56px] flex-row items-center gap-3 border-t border-line px-5 dark:border-line-dark"
          >
            <Checkbox checked={allSelected} />
            <Text className="flex-1 text-[15px] font-bold text-ink dark:text-ink-dark">
              {t('multiSelect.selectAll')}
            </Text>
          </Pressable>
        )}

        {visibleOptions.map((opt) => {
          const checked = values.includes(opt.value);
          return (
            <Pressable
              key={opt.value}
              onPress={() => toggle(opt.value)}
              className="min-h-[56px] flex-row items-center gap-3 border-t border-line px-5 dark:border-line-dark"
            >
              <Checkbox checked={checked} />
              {opt.leading ??
                (opt.dotColor || opt.icon ? (
                  <CategoryDot color={opt.dotColor} icon={opt.icon} size={16} />
                ) : null)}
              <Text className="flex-1 text-[15px] text-ink dark:text-ink-dark">{opt.label}</Text>
            </Pressable>
          );
        })}

        {visibleOptions.length === 0 && !onCreateNew ? (
          <Text className="px-5 py-4 text-sm text-ink-2 dark:text-ink-2-dark">
            {typed ? t('common:noResults') : t('multiSelect.empty')}
          </Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
