import { useCategoryTree } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { CategoryNode, CategoryType } from '@repo/core/types';
import { Fab, PageHeader, Screen, SegmentedControl } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

// Booked automatically by the "Ajustar saldo" flow — not a category a user
// should see or pick from here.
const HIDDEN_SLUGS = new Set(['balance_adjustment_expense', 'balance_adjustment_income']);

const TYPE_OPTIONS: { value: CategoryType; label: string }[] = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
];

function Group({ type, onEdit }: { type: CategoryType; onEdit: (id: string) => void }) {
  const { data: nodes } = useCategoryTree(type);
  const visible = (nodes ?? []).filter((n) => !HIDDEN_SLUGS.has(n.slug ?? ''));

  if (visible.length === 0) {
    return (
      <Text className="mt-8 text-center text-sm text-ink-2 dark:text-ink-2-dark">
        Sin categorías todavía.
      </Text>
    );
  }

  const sorted = [...visible].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
      {sorted.map((p: CategoryNode, i) => (
        <View key={p.id}>
          {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
          <Pressable
            onPress={() => onEdit(p.id)}
            className="flex-row items-center gap-3 py-3.5 active:opacity-60"
          >
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: p.color ?? '#94A3B8' }}
            />
            <View className="flex-1">
              <Text className="text-base text-ink dark:text-ink-dark">
                {resolveCategoryLabel(p)}
              </Text>
              {p.children.length > 0 ? (
                <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                  {p.children.length} subcategorías
                </Text>
              ) : null}
            </View>
            <Text className="text-lg text-ink-3 dark:text-ink-3-dark">›</Text>
          </Pressable>
          {p.children.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onEdit(c.id)}
              className="flex-row items-center gap-2.5 py-2.5 pl-6 active:opacity-60"
            >
              <View
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: c.color ?? p.color ?? '#94A3B8' }}
              />
              <Text className="flex-1 text-sm text-ink-2 dark:text-ink-2-dark">
                {resolveCategoryLabel(c)}
              </Text>
              <Text className="text-lg text-ink-3 dark:text-ink-3-dark">›</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function CategoriesScreen() {
  const router = useRouter();
  const [type, setType] = useState<CategoryType>('expense');
  const { isLoading, error } = useCategoryTree();

  const goEdit = (id: string) =>
    router.push({ pathname: '/(app)/settings/categories/[id]', params: { id } });

  return (
    <Screen className="gap-4">
      <PageHeader title="Categorías" onBack={() => router.back()} />
      <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <Text className="mt-8 text-center text-sm text-danger dark:text-danger-dark">
          {error.message}
        </Text>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="pb-8">
          <Group type={type} onEdit={goEdit} />
        </ScrollView>
      )}

      <View className="absolute bottom-6 right-5">
        <Fab
          accessibilityLabel="Nueva categoría"
          onPress={() => router.push('/(app)/settings/categories/new')}
        />
      </View>
    </Screen>
  );
}
