import { Ionicons } from '@expo/vector-icons';
import { useAccounts } from '@repo/core/hooks';
import type { Account, AccountType } from '@repo/core/types';
import { BottomSheet } from '@repo/ui';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

const TYPE_LABEL: Record<AccountType, string> = {
  cash: 'Efectivo',
  bank: 'Banco',
  credit_card: 'Tarjeta de crédito',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Hide this account (e.g. the transfer's "from" account in the "to" picker). */
  excludeId?: string | null;
}

/** Searchable flat list of active accounts — avoids an unbounded row of pills. */
export function AccountPicker({
  visible,
  onClose,
  title = 'Cuenta',
  selectedId,
  onSelect,
  excludeId,
}: Props) {
  const [q, setQ] = useState('');
  const { data: accounts } = useAccounts();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const active = (accounts ?? []).filter(
      (a: Account) => !a.archived && a.id !== excludeId,
    );
    if (!needle) return active;
    return active.filter((a) => a.name.toLowerCase().includes(needle));
  }, [accounts, q, excludeId]);

  const pick = (id: string) => {
    onSelect(id);
    setQ('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View className="px-5 pb-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar cuenta…"
          placeholderTextColor="#9CA3AF"
          className="h-11 rounded-ctl border border-line bg-surface px-3 text-[15px] text-ink dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark"
        />
      </View>

      <ScrollView className="max-h-[420px]" contentContainerClassName="pb-4">
        {filtered.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => pick(a.id)}
            className="flex-row items-center gap-3 border-t border-line px-5 py-3 dark:border-line-dark"
          >
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">{a.name}</Text>
              <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
                {TYPE_LABEL[a.type]} · {a.currency}
              </Text>
            </View>
            {selectedId === a.id ? <Ionicons name="checkmark" size={18} color="#4D7C0F" /> : null}
          </Pressable>
        ))}

        {filtered.length === 0 ? (
          <Text className="px-5 py-4 text-sm text-ink-2 dark:text-ink-2-dark">
            No hay cuentas que coincidan.
          </Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
