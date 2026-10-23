import { Ionicons } from '@expo/vector-icons';
import { BottomSheet, Chip, ICON_COLORS } from '@repo/ui';
import { useColorScheme } from 'nativewind';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  ICON_GROUPS,
  searchIconCatalog,
  type IconCatalogEntry,
  type IconCatalogGroup,
} from './icon-catalog';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** An Ionicons glyph name, or null when none is picked yet. */
  value: string | null;
  onSelect: (icon: string) => void;
}

/** Searchable, categorized grid over the curated `ICON_CATALOG` — same shape as `CategoryPicker`. */
export function IconPicker({ visible, onClose, value, onSelect }: Props) {
  const { t } = useTranslation(['icons', 'common']);
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<IconCatalogGroup | null>(null);

  const labelOf = useCallback(
    (entry: IconCatalogEntry) => (t as (key: string) => string)(`icons:labels.${entry.name}`),
    [t],
  );
  const results = useMemo(() => searchIconCatalog(q, group, labelOf), [q, group, labelOf]);
  const selectedColor = dark ? ICON_COLORS.limeInkDark : ICON_COLORS.limeInk;
  const idleColor = dark ? ICON_COLORS.ink2Dark : ICON_COLORS.ink2;

  const pick = (icon: string) => {
    onSelect(icon);
    setQ('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('pickTitle')}>
      <View className="px-5 pb-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('search')}
          placeholderTextColor={ICON_COLORS.ink3}
          className="h-11 rounded-ctl border border-line bg-surface px-3 text-[15px] text-ink dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-5 pb-3"
      >
        <Chip label={t('common:all')} selected={group === null} onPress={() => setGroup(null)} />
        {ICON_GROUPS.map((g) => (
          <Chip
            key={g}
            label={t(`groups.${g}`)}
            selected={group === g}
            onPress={() => setGroup((prev) => (prev === g ? null : g))}
          />
        ))}
      </ScrollView>

      <ScrollView
        className="max-h-[420px]"
        contentContainerClassName="px-5 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row flex-wrap gap-3">
          {results.map((entry) => {
            const selected = value === entry.name;
            return (
              <Pressable
                key={entry.name}
                accessibilityRole="button"
                accessibilityLabel={labelOf(entry)}
                accessibilityState={{ selected }}
                onPress={() => pick(entry.name)}
                className={`h-[52px] w-[52px] items-center justify-center rounded-full ${
                  selected
                    ? 'bg-lime-tint dark:bg-lime-tint-dark'
                    : 'bg-[#F6F7F9] dark:bg-line-dark'
                }`}
              >
                <Ionicons
                  name={entry.name}
                  size={22}
                  color={selected ? selectedColor : idleColor}
                />
              </Pressable>
            );
          })}
        </View>

        {results.length === 0 ? (
          <Text className="px-1 py-6 text-center text-sm text-ink-2 dark:text-ink-2-dark">
            {t('common:noResults')}
          </Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
