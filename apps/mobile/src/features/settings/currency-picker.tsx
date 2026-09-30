import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES, type CurrencyMeta } from '@repo/core/utils';
import { BottomSheet } from '@repo/ui';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedCode: string;
  onSelect: (currency: CurrencyMeta) => void;
}

const Row = memo(function Row({
  item,
  selected,
  onPress,
}: {
  item: CurrencyMeta;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-t border-line px-5 py-3 dark:border-line-dark"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
        <Text className="text-[13px] font-bold text-[#4D7C0F]">{item.symbol}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-medium capitalize text-ink dark:text-ink-dark">
          {item.name}
        </Text>
        <Text className="text-xs text-ink-2 dark:text-ink-2-dark">{item.code}</Text>
      </View>
      {selected ? <Ionicons name="checkmark" size={18} color="#4D7C0F" /> : null}
    </Pressable>
  );
});

/** Searchable list of ISO 4217 currencies (name, code, symbol) — matches by
 * either name or code so "peso" and "MXN" both find the same row. A
 * `FlatList` (not the codebase's usual `ScrollView` + `.map`) because this
 * list runs ~150 rows long, unlike every other picker's short list — without
 * virtualization, re-rendering all of them on each keystroke was slow enough
 * to drop keystrokes in the search field. */
export function CurrencyPicker({ visible, onClose, selectedCode, onSelect }: Props) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return CURRENCIES;
    return CURRENCIES.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.code.toLowerCase().includes(needle),
    );
  }, [q]);

  const pick = (c: CurrencyMeta) => {
    onSelect(c);
    setQ('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Moneda">
      <View className="px-5 pb-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar moneda o código…"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          className="h-11 rounded-ctl border border-line bg-surface px-3 text-[15px] text-ink dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark"
        />
      </View>

      <FlatList
        style={{ maxHeight: 420 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        data={filtered}
        keyExtractor={(c) => c.code}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        windowSize={5}
        renderItem={({ item }) => (
          <Row item={item} selected={selectedCode === item.code} onPress={() => pick(item)} />
        )}
        ListEmptyComponent={
          <Text className="px-5 py-4 text-sm text-ink-2 dark:text-ink-2-dark">
            No hay monedas que coincidan.
          </Text>
        }
      />
    </BottomSheet>
  );
}
