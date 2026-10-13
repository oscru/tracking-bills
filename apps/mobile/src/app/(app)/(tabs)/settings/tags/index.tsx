import { useTags, useTransactions } from '@repo/core/hooks';
import { tagCounts, toFriendlyMessage } from '@repo/core/utils';
import {
  EmptyState,
  ErrorCard,
  ListRow,
  PageHeader,
  Screen,
  SegmentedControl,
  StaggerItem,
  TagsEmptyIllustration,
} from '@repo/ui';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useTabBarAction } from '../../../../../features/navigation/floating-tab-bar';

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

  useTabBarAction({
    icon: Plus,
    accessibilityLabel: 'Nueva tag',
    onPress: () => router.push('/(app)/settings/tags/new'),
  });

  return (
    <Screen edges={['top']} className="gap-4">
      <PageHeader title="Tags" onBack={() => router.back()} />
      <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, 'No se pudieron cargar las tags')} />
        </View>
      ) : visible.length === 0 ? (
        <EmptyState
          illustration={<TagsEmptyIllustration />}
          title={status === 'archived' ? 'Sin tags archivadas' : 'Sin tags todavía'}
          description={
            status === 'archived'
              ? undefined
              : 'Crea una tag para agrupar movimientos entre categorías.'
          }
        />
      ) : (
        <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
          {visible.map((tag, i) => {
            const { expense, income } = tagCounts(tag.id, transactions ?? []);
            const total = expense + income;
            return (
              <StaggerItem key={tag.id} index={i}>
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
              </StaggerItem>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
