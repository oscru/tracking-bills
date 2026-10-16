import { useTagTransactionCounts, useTags } from '@repo/core/hooks';
import { toFriendlyMessage } from '@repo/core/utils';
import {
  EmptyState,
  ErrorCard,
  ListRow,
  PageHeader,
  Screen,
  SegmentedControl,
  StaggerItem,
  TagsEmptyIllustration,
  useTabBarScrollPadding,
  useIsDesktop,
} from '@repo/ui';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View, ScrollView } from 'react-native';

import { useTabBarAction } from '../../../../../features/navigation/floating-tab-bar';
import { MasterDetailEmpty, useInListPane } from '../../../../../features/settings/master-detail';

const STATUS_OPTIONS: { value: 'active' | 'archived'; label: string }[] = [
  { value: 'active', label: 'Activas' },
  { value: 'archived', label: 'Archivadas' },
];

const NO_COUNTS = { expense: 0, income: 0 };

/** The section's list — on desktop, also drawn beside the open record (see `_layout`). */
export function TagsList() {
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  // Desktop: the record open in the pane beside this list.
  const { id: selectedId } = useGlobalSearchParams<{ id?: string }>();
  const inPane = useInListPane();
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const { data: tags, isLoading, error } = useTags();
  // How many movements carry each tag, counted by Postgres.
  const { data: counts } = useTagTransactionCounts();

  const visible = (tags ?? []).filter((t) => (status === 'archived' ? t.archived : !t.archived));

  useTabBarAction(
    inPane
      ? false
      : {
          icon: Plus,
          accessibilityLabel: 'Nueva tag',
          onPress: () => router.push('/(app)/settings/tags/new'),
        },
  );

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
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: scrollPadding }}
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
            {visible.map((tag, i) => {
              const { expense, income } = counts?.get(tag.id) ?? NO_COUNTS;
              const total = expense + income;
              return (
                <StaggerItem key={tag.id} index={i}>
                  {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
                  <ListRow
                    title={tag.name}
                    subtitle={`${total} transacci${total === 1 ? 'ón' : 'ones'}`}
                    dotColor={tag.color}
                    showChevron
                    selected={inPane && selectedId === tag.id}
                    onPress={() =>
                      router.push({ pathname: '/(app)/settings/tags/[id]', params: { id: tag.id } })
                    }
                  />
                </StaggerItem>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

/**
 * The section's index route. Desktop: the list lives in the layout's left
 * pane, so this is the right pane's "nothing open yet" state. Phones: the
 * list itself.
 */
export default function TagsScreen() {
  const desktop = useIsDesktop();
  const router = useRouter();
  if (!desktop) return <TagsList />;
  return (
    <MasterDetailEmpty
      illustration={<TagsEmptyIllustration />}
      title="Elige una tag"
      description="Sus movimientos aparecen aquí, junto a la lista."
      action={{
        icon: Plus,
        accessibilityLabel: 'Nueva tag',
        onPress: () => router.push('/(app)/settings/tags/new'),
      }}
    />
  );
}
