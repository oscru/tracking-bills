import { useCategories } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { Category } from '@repo/core/types';
import { ListRow, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

function Group({
  title,
  items,
  onEdit,
}: {
  title: string;
  items: Category[];
  onEdit: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</Text>
      <View className="rounded-2xl border border-neutral-200 px-4 dark:border-neutral-800">
        {items.map((c, i) => (
          <View key={c.id}>
            {i > 0 ? <View className="h-px bg-neutral-100 dark:bg-neutral-800" /> : null}
            <ListRow
              title={resolveCategoryLabel(c)}
              subtitle={c.is_default ? 'Predeterminada' : undefined}
              dotColor={c.color}
              showChevron={!c.is_default}
              onPress={c.is_default ? undefined : () => onEdit(c.id)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function CategoriesScreen() {
  const router = useRouter();
  const { data: categories, isLoading, error } = useCategories();

  const { expense, income } = useMemo(() => {
    const sorted = [...(categories ?? [])].sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    return {
      expense: sorted.filter((c) => c.type === 'expense'),
      income: sorted.filter((c) => c.type === 'income'),
    };
  }, [categories]);

  const goEdit = (id: string) =>
    router.push({ pathname: '/(app)/settings/categories/[id]', params: { id } });

  return (
    <Screen className="gap-4">
      <View className="flex-row items-center justify-between pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">‹ Ajustes</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(app)/settings/categories/new')} hitSlop={8}>
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Nueva</Text>
        </Pressable>
      </View>

      <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Categorías</Text>

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <Text className="mt-8 text-center text-sm text-red-500">{error.message}</Text>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-8">
          <Group title="Gastos" items={expense} onEdit={goEdit} />
          <Group title="Ingresos" items={income} onEdit={goEdit} />
        </ScrollView>
      )}
    </Screen>
  );
}
