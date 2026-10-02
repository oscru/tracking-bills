import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES, type CurrencyMeta } from '@repo/core/utils';
import { BottomSheet, Button } from '@repo/ui';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedCode: string;
  onSelect: (currency: CurrencyMeta) => void;
  /** Narrows the list to these codes (e.g. the profile's `enabled_currencies`) instead of all of ISO 4217. */
  codes?: string[];
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
export function CurrencyPicker({ visible, onClose, selectedCode, onSelect, codes }: Props) {
  const [q, setQ] = useState('');

  const base = useMemo(
    () => (codes ? CURRENCIES.filter((c) => codes.includes(c.code)) : CURRENCIES),
    [codes],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.code.toLowerCase().includes(needle),
    );
  }, [base, q]);

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

const MultiRow = memo(function MultiRow({
  item,
  selected,
  disabled,
  onPress,
}: {
  item: CurrencyMeta;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-t border-line px-5 py-3 dark:border-line-dark"
      style={disabled ? { opacity: 0.4 } : undefined}
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
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={selected ? '#4D7C0F' : '#9CA3AF'}
      />
    </Pressable>
  );
});

interface MultiProps {
  visible: boolean;
  onClose: () => void;
  selectedCodes: string[];
  onToggle: (code: string) => void;
  /** Blocks deselecting below this many — there must always be at least one currency to offer. */
  minSelected?: number;
}

/**
 * Like picking languages in a translator app: search the full ISO 4217 list
 * and tap as many as you actually use — these become `enabled_currencies`,
 * the subset every other currency picker in the app offers.
 */
export function CurrencyMultiPicker({
  visible,
  onClose,
  selectedCodes,
  onToggle,
  minSelected = 1,
}: MultiProps) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return CURRENCIES;
    return CURRENCIES.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.code.toLowerCase().includes(needle),
    );
  }, [q]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Divisas habilitadas">
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
        renderItem={({ item }) => {
          const selected = selectedCodes.includes(item.code);
          const disabled = selected && selectedCodes.length <= minSelected;
          return (
            <MultiRow
              item={item}
              selected={selected}
              disabled={disabled}
              onPress={() => {
                if (disabled) return;
                onToggle(item.code);
              }}
            />
          );
        }}
        ListEmptyComponent={
          <Text className="px-5 py-4 text-sm text-ink-2 dark:text-ink-2-dark">
            No hay monedas que coincidan.
          </Text>
        }
      />

      <View className="px-5 pb-4 pt-2">
        <Button label="Listo" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}
