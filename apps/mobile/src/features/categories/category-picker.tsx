import { Ionicons } from '@expo/vector-icons';
import { useCategories, useCategoryTree, useTransactions } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { Category, CategoryType } from '@repo/core/types';
import { BottomSheet, Chip } from '@repo/ui';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  type: CategoryType;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreateNew?: () => void;
  /** Pick a PARENT: flat list of top-level categories only, plus "Ninguna". */
  parentOnly?: boolean;
  /** Hide this id (a category can't be its own parent). */
  excludeId?: string;
}

export function CategoryPicker({
  visible,
  onClose,
  type,
  selectedId,
  onSelect,
  onCreateNew,
  parentOnly = false,
  excludeId,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const [q, setQ] = useState('');
  const { data: tree } = useCategoryTree(type);
  const { data: allCategories } = useCategories();
  const { data: transactions } = useTransactions({ limit: 60 });

  const recents = useMemo<Category[]>(() => {
    const seen = new Set<string>();
    const out: Category[] = [];
    for (const t of transactions ?? []) {
      if (t.type !== type || !t.category?.id || seen.has(t.category.id)) continue;
      seen.add(t.category.id);
      const full = (allCategories ?? []).find((c) => c.id === t.category?.id);
      if (full) out.push(full);
      if (out.length >= 5) break;
    }
    return out;
  }, [transactions, allCategories, type]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let roots = (tree ?? []).filter((p) => p.id !== excludeId);
    if (parentOnly) {
      roots = roots.map((p) => ({ ...p, children: [] }));
    }
    if (!needle) return roots;
    return roots
      .map((p) => ({
        ...p,
        children: p.children.filter((c) => resolveCategoryLabel(c).toLowerCase().includes(needle)),
      }))
      .filter(
        (p) => resolveCategoryLabel(p).toLowerCase().includes(needle) || p.children.length > 0,
      );
  }, [tree, q, parentOnly, excludeId]);

  const pick = (id: string | null) => {
    onSelect(id);
    setQ('');
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={parentOnly ? 'Categoría superior' : 'Categoría'}
      headerAction={
        onCreateNew ? (
          <Pressable onPress={onCreateNew} hitSlop={8}>
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              + Crear
            </Text>
          </Pressable>
        ) : undefined
      }
    >
      <View className="px-5 pb-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar categoría…"
          placeholderTextColor="#9CA3AF"
          className="h-11 rounded-ctl border border-line bg-surface px-3 text-[15px] text-ink dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark"
        />
      </View>

      {!parentOnly && recents.length > 0 && !q ? (
        <View className="gap-2 px-5 pb-3">
          <Text className="text-xs font-bold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
            Frecuentes
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {recents.map((c) => (
              <Chip
                key={c.id}
                label={resolveCategoryLabel(c)}
                dotColor={c.color}
                selected={selectedId === c.id}
                onPress={() => pick(c.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <ScrollView
        style={{ height: windowHeight * 0.65 }}
        contentContainerClassName="pb-4"
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => pick(null)}
          className="border-t border-line px-5 py-5 dark:border-line-dark"
        >
          <Text className="text-[15px] text-ink-2 dark:text-ink-2-dark">
            {parentOnly ? 'Ninguna (categoría de primer nivel)' : 'Sin categoría'}
          </Text>
        </Pressable>

        {filtered.map((p) => (
          <View key={p.id}>
            <Pressable
              onPress={() => pick(p.id)}
              className="flex-row items-center gap-3 border-t border-line px-5 py-5 dark:border-line-dark"
            >
              <View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: p.color ?? '#94A3B8' }}
              />
              <Text className="flex-1 text-[15px] font-bold text-ink dark:text-ink-dark">
                {resolveCategoryLabel(p)}
              </Text>
              {selectedId === p.id ? <Ionicons name="checkmark" size={18} color="#4D7C0F" /> : null}
            </Pressable>
            {p.children.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => pick(c.id)}
                className="flex-row items-center gap-2.5 border-t border-line py-4 pl-11 pr-5 dark:border-line-dark"
              >
                <View
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: c.color ?? p.color ?? '#94A3B8' }}
                />
                <Text className="flex-1 text-[14px] text-ink-2 dark:text-ink-2-dark">
                  {resolveCategoryLabel(c)}
                </Text>
                {selectedId === c.id ? (
                  <Ionicons name="checkmark" size={16} color="#4D7C0F" />
                ) : null}
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}
