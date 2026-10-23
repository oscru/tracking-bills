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
} from '@repo/ui';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View, ScrollView } from 'react-native';

import { useTabBarAction } from '../../../../../features/navigation/floating-tab-bar';
import {
  MasterDetailEmpty,
  useInListPane,
  useMasterDetailPanes,
} from '../../../../../features/settings/master-detail';

const STATUSES = ['active', 'archived'] as const;

const NO_COUNTS = { expense: 0, income: 0 };

/** The section's list — on a wide desktop, also drawn beside the open record (see `_layout`). */
export function TagsList() {
  const { t } = useTranslation('tags');
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
          accessibilityLabel: t('new'),
          onPress: () => router.push('/(app)/settings/tags/new'),
        },
  );

  return (
    <Screen edges={['top']} className="gap-4">
      <PageHeader title={t('title')} onBack={() => router.back()} />
      <SegmentedControl
        options={STATUSES.map((value) => ({ value, label: t(`tabs.${value}`) }))}
        value={status}
        onChange={setStatus}
      />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, t('loadFailed'))} />
        </View>
      ) : visible.length === 0 ? (
        <EmptyState
          illustration={<TagsEmptyIllustration />}
          title={t(status === 'archived' ? 'emptyArchived' : 'empty')}
          description={status === 'archived' ? undefined : t('emptyHint')}
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
                    subtitle={t('count', { count: total })}
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
  const { t } = useTranslation('tags');
  const panes = useMasterDetailPanes();
  const router = useRouter();
  if (!panes) return <TagsList />;
  return (
    <MasterDetailEmpty
      illustration={<TagsEmptyIllustration />}
      title={t('pickTitle')}
      description={t('pickHint')}
      action={{
        icon: Plus,
        accessibilityLabel: t('new'),
        onPress: () => router.push('/(app)/settings/tags/new'),
      }}
    />
  );
}
