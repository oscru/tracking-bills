import { useTags, useTransactions } from '@repo/core/hooks';
import { tagCounts, toFriendlyMessage } from '@repo/core/utils';
import { ErrorCard, Fab, ListRow, PageHeader, Screen, SegmentedControl } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

const STATUS_OPTIONS: { value: 'active' | 'archived'; label: string }[] = [
  { value: 'active', label: 'Activas' },
  { value: 'archived', label: 'Archivadas' },
];

export default function TagsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const { data: tags, isLoading, error } = useTags();
  const { data: transactions } = useTransactions();

  const visible = (tags ?? []).filter((t) => (status === 'archived' ? t.archived : !t.archived));

  return (
    <Screen className="gap-4">
      <PageHeader title="Tags" onBack={() => router.back()} />
      <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, 'No se pudieron cargar las tags')} />
        </View>
      ) : visible.length === 0 ? (
        <Text className="mt-8 text-center text-sm text-ink-2 dark:text-ink-2-dark">
          {status === 'archived' ? 'Sin tags archivadas.' : 'Sin tags todavía.'}
        </Text>
      ) : (
        <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
          {visible.map((tag, i) => {
            const { expense, income } = tagCounts(tag.id, transactions ?? []);
            const total = expense + income;
            return (
              <View key={tag.id}>
                {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
                <ListRow
                  title={tag.name}
                  subtitle={`${total} transacci${total === 1 ? 'ón' : 'ones'}`}
                  dotColor={tag.color}
                  showChevron
                  onPress={() =>
                    router.push({ pathname: '/(app)/settings/tags/[id]', params: { id: tag.id } })
                  }
                />
              </View>
            );
          })}
        </View>
      )}

      <View className="absolute bottom-6 right-5">
        <Fab accessibilityLabel="Nueva tag" onPress={() => router.push('/(app)/settings/tags/new')} />
      </View>
    </Screen>
  );
}
