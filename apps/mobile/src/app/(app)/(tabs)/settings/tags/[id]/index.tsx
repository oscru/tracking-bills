import { useStableRecord, useTagTransactionCounts, useTags, useUpdateTag } from '@repo/core/hooks';
import {
  Button,
  ConfirmSheet,
  PageHeader,
  Screen,
  ICON_COLORS,
  useTabBarScrollPadding,
} from '@repo/ui';
import { formatDateTime } from '@repo/core/utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowUpDown, Pencil } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { RecordInfoButton } from '../../../../../../features/design/record-info';
import { useTabBarAction } from '../../../../../../features/navigation/floating-tab-bar';
import { TagDetailSkeleton } from '../../../../../../features/tags/tag-detail-skeleton';

export default function TagDetail() {
  const { t } = useTranslation(['tags', 'common']);
  const scrollPadding = useTabBarScrollPadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: tags, isLoading: loadingTags } = useTags();
  // How many movements carry this tag, counted by Postgres.
  const { data: counts, isLoading: loadingTx } = useTagTransactionCounts();
  const updateTag = useUpdateTag();
  const [confirmArchive, setConfirmArchive] = useState(false);

  const tag = useStableRecord((tags ?? []).find((t) => t.id === id));

  const total = useMemo(() => {
    if (!tag) return 0;
    const entry = counts?.get(tag.id);
    return (entry?.expense ?? 0) + (entry?.income ?? 0);
  }, [tag, counts]);

  useTabBarAction(
    tag
      ? {
          icon: Pencil,
          accessibilityLabel: t('edit'),
          onPress: () =>
            router.push({
              pathname: '/(app)/settings/tags/[id]/edit',
              params: { id: tag.id },
            }),
        }
      : null,
  );

  if (loadingTags || loadingTx) {
    return (
      <Screen edges={['top']} className="gap-5">
        <PageHeader title={t('tag')} onBack={() => router.back()} />
        <TagDetailSkeleton />
      </Screen>
    );
  }
  if (!tag) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">{t('notFound')}</Text>
      </Screen>
    );
  }

  const toggleArchive = () => updateTag.mutate({ id: tag.id, patch: { archived: !tag.archived } });

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader
        title={tag.name}
        onBack={() => router.back()}
        action={
          <RecordInfoButton
            title={t('info')}
            rows={[
              { label: t('transactions'), value: String(total) },
              { label: t('common:info.created'), value: formatDateTime(tag.created_at) },
              { label: t('common:info.updated'), value: formatDateTime(tag.updated_at) },
              {
                label: t('common:info.archived'),
                value: tag.archived_at ? formatDateTime(tag.archived_at) : '',
              },
            ]}
          />
        }
      />

      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5"
          contentContainerStyle={{ paddingBottom: scrollPadding }}
        >
          <View className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: tag.color ?? '#94A3B8' }}
            />
            <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
              {tag.archived ? t('archivedBadge') : t('tag')}
            </Text>
          </View>

          <Pressable
            onPress={() =>
              router.push({ pathname: '/(app)/transactions', params: { tagId: tag.id } })
            }
            className="rounded-2xl border border-line bg-surface p-4 active:opacity-70 dark:border-line-dark dark:bg-surface-dark"
          >
            <View className="flex-row items-center gap-1.5">
              <ArrowUpDown size={16} color={tag.color ?? ICON_COLORS.limeInk} />
              <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">
                {t('transactionsCard')}
              </Text>
            </View>
            <Text className="mt-1 text-2xl font-bold text-ink dark:text-ink-dark">{total}</Text>
            <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
              {t('linked', { count: total })}
            </Text>
          </Pressable>

          <View className="border-t border-line pt-5 dark:border-line-dark">
            <Button
              label={t(tag.archived ? 'common:unarchive' : 'common:archive')}
              variant={tag.archived ? 'secondary' : 'ghost-danger'}
              loading={updateTag.isPending}
              onPress={() => (tag.archived ? toggleArchive() : setConfirmArchive(true))}
            />
          </View>
        </ScrollView>
      </View>

      <ConfirmSheet
        visible={confirmArchive}
        title={t('archiveTitle')}
        description={t('archiveBody')}
        confirmLabel={t('common:archive')}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          toggleArchive();
        }}
      />
    </Screen>
  );
}
