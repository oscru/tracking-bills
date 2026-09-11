import { useCategoryTree } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { CategoryNode, CategoryType } from '@repo/core/types';
import { Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

function Group({
  title,
  type,
  onEdit,
}: {
  title: string;
  type: CategoryType;
  onEdit: (id: string) => void;
}) {
  const { data: nodes } = useCategoryTree(type);
  if (!nodes || nodes.length === 0) return null;

  const sorted = [...nodes].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">{title}</Text>
      <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
        {sorted.map((p: CategoryNode, i) => (
          <View key={p.id}>
            {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
            <Pressable
              onPress={p.is_default ? undefined : () => onEdit(p.id)}
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
                <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                  {p.is_default ? 'Predeterminada' : 'Tuya'}
                  {p.children.length > 0 ? ` · ${p.children.length} subcategorías` : ''}
                </Text>
              </View>
              {p.is_default ? null : (
                <Text className="text-lg text-ink-3 dark:text-ink-3-dark">›</Text>
              )}
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
    </View>
  );
}

export default function CategoriesScreen() {
  const router = useRouter();
  const { isLoading, error } = useCategoryTree();

  const goEdit = (id: string) =>
    router.push({ pathname: '/(app)/settings/categories/[id]', params: { id } });

  return (
    <Screen className="gap-4">
      <View className="flex-row items-center justify-between pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">‹ Ajustes</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(app)/settings/categories/new')} hitSlop={8}>
          <Text className="text-sm font-semibold text-lime-ink dark:text-lime-ink-dark">Nueva</Text>
        </Pressable>
      </View>

      <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Categorías</Text>

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <Text className="mt-8 text-center text-sm text-danger dark:text-danger-dark">
          {error.message}
        </Text>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-8">
          <Group title="Gastos" type="expense" onEdit={goEdit} />
          <Group title="Ingresos" type="income" onEdit={goEdit} />
        </ScrollView>
      )}
    </Screen>
  );
}
