import { useCategoryTree } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { CategoryNode, CategoryType } from '@repo/core/types';
import { toFriendlyMessage } from '@repo/core/utils';
import {
  CategoriesEmptyIllustration,
  CategoryDot,
  EmptyState,
  ErrorCard,
  PageHeader,
  Screen,
  SegmentedControl,
  StaggerItem,
  TextField,
  useTabBarScrollPadding,
} from '@repo/ui';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useTabBarAction } from '../../../../../features/navigation/floating-tab-bar';
import {
  MasterDetailEmpty,
  useInListPane,
  useMasterDetailPanes,
} from '../../../../../features/settings/master-detail';

// Booked automatically by the "Ajustar saldo" flow — not a category a user
// should see or pick from here.
const HIDDEN_SLUGS = new Set(['balance_adjustment_expense', 'balance_adjustment_income']);

const TYPES: CategoryType[] = ['expense', 'income'];

function Group({
  type,
  search,
  onEdit,
  selectedId,
}: {
  type: CategoryType;
  search: string;
  onEdit: (id: string) => void;
  selectedId?: string;
}) {
  const { t } = useTranslation('categories');
  const { data: nodes } = useCategoryTree(type);
  const visible = (nodes ?? []).filter((n) => !HIDDEN_SLUGS.has(n.slug ?? ''));

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return visible;
    return visible
      .map((p) => ({
        ...p,
        children: p.children.filter((c) => resolveCategoryLabel(c).toLowerCase().includes(needle)),
      }))
      .filter(
        (p) => resolveCategoryLabel(p).toLowerCase().includes(needle) || p.children.length > 0,
      );
  }, [visible, search]);

  if (visible.length === 0) {
    return (
      <EmptyState
        illustration={<CategoriesEmptyIllustration />}
        title={t('empty')}
        description={t('emptyHint')}
      />
    );
  }

  if (filtered.length === 0) {
    return (
      <Text className="mt-8 text-center text-sm text-ink-2 dark:text-ink-2-dark">
        {t('noResultsFor', { query: search.trim() })}
      </Text>
    );
  }

  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
      {sorted.map((p: CategoryNode, i) => (
        <StaggerItem key={p.id} index={i}>
          {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
          <Pressable
            onPress={() => onEdit(p.id)}
            className={`flex-row items-center gap-3 py-3.5 active:opacity-60 ${
              selectedId === p.id ? SELECTED_ROW : ''
            }`}
          >
            <CategoryDot color={p.color} icon={p.icon} size={16} />
            <View className="flex-1">
              <Text className="text-base text-ink dark:text-ink-dark">
                {resolveCategoryLabel(p)}
                {p.archived ? t('archivedSuffix') : ''}
              </Text>
              {p.children.length > 0 ? (
                <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
                  {t('subcategoriesCount', { count: p.children.length })}
                </Text>
              ) : null}
            </View>
            <Text className="text-lg text-ink-3 dark:text-ink-3-dark">›</Text>
          </Pressable>
          {p.children.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onEdit(c.id)}
              className={`flex-row items-center gap-2.5 py-2.5 pl-6 active:opacity-60 ${
                selectedId === c.id ? SELECTED_ROW : ''
              }`}
            >
              <CategoryDot color={c.color ?? p.color} icon={c.icon} size={13} />
              <Text className="flex-1 text-sm text-ink-2 dark:text-ink-2-dark">
                {resolveCategoryLabel(c)}
                {c.archived ? t('archivedSuffix') : ''}
              </Text>
              <Text className="text-lg text-ink-3 dark:text-ink-3-dark">›</Text>
            </Pressable>
          ))}
        </StaggerItem>
      ))}
    </View>
  );
}

// Same highlight as `ListRow`'s `selected`.
const SELECTED_ROW = '-mx-2 rounded-xl bg-lime-tint px-2 dark:bg-lime-tint-dark';

/** The section's list — on a wide desktop, also drawn beside the open record (see `_layout`). */
export function CategoriesList() {
  const { t } = useTranslation(['categories', 'common']);
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  // Desktop: the record open in the pane beside this list.
  const { id: selectedId } = useGlobalSearchParams<{ id?: string }>();
  const inPane = useInListPane();
  const [type, setType] = useState<CategoryType>('expense');
  const [search, setSearch] = useState('');
  const { isLoading, error } = useCategoryTree();

  const goEdit = (id: string) =>
    router.push({ pathname: '/(app)/settings/categories/[id]', params: { id } });

  useTabBarAction(
    inPane
      ? false
      : {
          icon: Plus,
          accessibilityLabel: t('new'),
          onPress: () => router.push('/(app)/settings/categories/new'),
        },
  );

  return (
    <Screen edges={['top']} className="gap-4">
      <PageHeader title={t('title')} onBack={() => router.back()} />
      <SegmentedControl
        options={TYPES.map((value) => ({
          value,
          label: t(value === 'income' ? 'common:income' : 'common:expenses'),
        }))}
        value={type}
        onChange={setType}
      />
      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder={t('search')}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, t('loadFailed'))} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: scrollPadding }}
        >
          <Group
            type={type}
            search={search}
            onEdit={goEdit}
            selectedId={inPane ? selectedId : undefined}
          />
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
export default function CategoriesScreen() {
  const { t } = useTranslation('categories');
  const panes = useMasterDetailPanes();
  const router = useRouter();
  if (!panes) return <CategoriesList />;
  return (
    <MasterDetailEmpty
      illustration={<CategoriesEmptyIllustration />}
      title={t('pickTitle')}
      description={t('pickHint')}
      action={{
        icon: Plus,
        accessibilityLabel: t('new'),
        onPress: () => router.push('/(app)/settings/categories/new'),
      }}
    />
  );
}
