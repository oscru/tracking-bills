import { Ionicons } from '@expo/vector-icons';
import { BottomSheet, Chip } from '@repo/ui';
import { useColorScheme } from 'nativewind';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ICON_GROUPS, searchIconCatalog, type IconCatalogGroup } from './icon-catalog';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** An Ionicons glyph name, or null when none is picked yet. */
  value: string | null;
  onSelect: (icon: string) => void;
}

/** Searchable, categorized grid over the curated `ICON_CATALOG` — same shape as `CategoryPicker`. */
export function IconPicker({ visible, onClose, value, onSelect }: Props) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<IconCatalogGroup | null>(null);

  const results = useMemo(() => searchIconCatalog(q, group), [q, group]);
  const selectedColor = dark ? '#A3E635' : '#4D7C0F';
  const idleColor = dark ? '#9BA1A8' : '#6B7280';

  const pick = (icon: string) => {
    onSelect(icon);
    setQ('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Elegir ícono">
      <View className="px-5 pb-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar ícono…"
          placeholderTextColor="#9CA3AF"
          className="h-11 rounded-ctl border border-line bg-surface px-3 text-[15px] text-ink dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-5 pb-3"
      >
        <Chip label="Todos" selected={group === null} onPress={() => setGroup(null)} />
        {ICON_GROUPS.map((g) => (
          <Chip
            key={g.value}
            label={g.label}
            selected={group === g.value}
            onPress={() => setGroup((prev) => (prev === g.value ? null : g.value))}
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
                accessibilityLabel={entry.label}
                accessibilityState={{ selected }}
                onPress={() => pick(entry.name)}
                className={`h-[52px] w-[52px] items-center justify-center rounded-full ${
                  selected ? 'bg-lime-tint dark:bg-lime-tint-dark' : 'bg-[#F6F7F9] dark:bg-line-dark'
                }`}
              >
                <Ionicons name={entry.name} size={22} color={selected ? selectedColor : idleColor} />
              </Pressable>
            );
          })}
        </View>

        {results.length === 0 ? (
          <Text className="px-1 py-6 text-center text-sm text-ink-2 dark:text-ink-2-dark">
            Sin resultados.
          </Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
