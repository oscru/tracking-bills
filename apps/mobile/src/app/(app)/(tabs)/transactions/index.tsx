import { useAccounts, useCategoryTree, useTags, useTransactions } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionType } from '@repo/core/types';
import { formatCurrency, toFriendlyMessage } from '@repo/core/utils';
import {
  EmptyState,
  ErrorCard,
  Screen,
  StaggerItem,
  TextField,
  TransactionsEmptyIllustration,
  ICON_COLORS,
} from '@repo/ui';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ListFilter } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, SectionList, Text, View } from 'react-native';

import { FavoritesRow } from '../../../../features/favorites/favorites-row';
import { dayHeaderLabel, groupByDay } from '../../../../features/transactions/day-groups';
import { FiltersSheet } from '../../../../features/transactions/filters-sheet';
import { TransactionListItem } from '../../../../features/transactions/transaction-list-item';
import { TransactionsSkeleton } from '../../../../features/transactions/transactions-skeleton';

// Defined once at module scope: an inline `() => <View/>` is a brand-new
// component type on every render, so React unmounted and remounted every
// separator in the list each time this screen re-rendered.
function RowSeparator() {
  return (
    <View className="border-x border-line bg-canvas px-3 dark:border-line-dark dark:bg-canvas-dark">
      <View className="h-px bg-line dark:bg-line-dark" />
    </View>
  );
}

// Only the rows visible on first paint cascade in. Rows further down are
// mounted by virtualization while you scroll, and animating each of those
// as it appears just costs frames.
const STAGGERED_ROWS = 8;

const TITLE: Record<TransactionType, string> = {
  income: 'Ingresos',
  expense: 'Gastos',
  transfer: 'Transferencias',
};

export default function TransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: TransactionType;
    from?: string;
    to?: string;
    accountId?: string;
    tagId?: string;
    /** `'1'` — only planned/pending movements (e.g. from the home screen's reminder). */
    pending?: string;
  }>();

  const [type, setType] = useState<TransactionType | null>(params.type ?? null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [from, setFrom] = useState<string | null>(params.from ?? null);
  const [to, setTo] = useState<string | null>(params.to ?? null);
  const [accountIds, setAccountIds] = useState<string[]>(
    params.accountId ? [params.accountId] : [],
  );
  const [tagIds, setTagIds] = useState<string[]>(params.tagId ? [params.tagId] : []);
  const [pendingOnly, setPendingOnly] = useState(params.pending === '1');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Tabs stay mounted, so a repeat push (e.g. a different month's card from
  // Home) only changes `params` — re-apply the nav filters whenever they do.
  const navParamsKey = `${params.type ?? ''}|${params.from ?? ''}|${params.to ?? ''}|${params.accountId ?? ''}|${params.tagId ?? ''}|${params.pending ?? ''}`;
  const [appliedNavParamsKey, setAppliedNavParamsKey] = useState(navParamsKey);
  if (navParamsKey !== appliedNavParamsKey) {
    setAppliedNavParamsKey(navParamsKey);
    setType(params.type ?? null);
    setCategoryIds([]);
    setFrom(params.from ?? null);
    setTo(params.to ?? null);
    setAccountIds(params.accountId ? [params.accountId] : []);
    setTagIds(params.tagId ? [params.tagId] : []);
    setPendingOnly(params.pending === '1');
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Which row (by id) currently has its swipe actions revealed — only one at
  // a time. Cleared on blur/refocus so nothing is left open when we return.
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const handleRowReveal = useCallback((id: string) => setOpenRowId(id), []);
  useFocusEffect(
    useCallback(() => {
      return () => setOpenRowId(null);
    }, []),
  );

  // Stable across renders — passed straight into `TransactionListItem`'s
  // gesture handling, which needs referentially-stable callbacks to avoid
  // rebuilding its native gesture event binding on every re-render (search
  // typing, a refetch on focus, etc. — see its own comments for the chain
  // this feeds into).
  const goToTransaction = useCallback(
    (id: string) => router.push({ pathname: '/(app)/transactions/[id]', params: { id } }),
    [router],
  );
  const goToEditTransaction = useCallback(
    (id: string) => router.push({ pathname: '/(app)/transactions/[id]/edit', params: { id } }),
    [router],
  );

  const { data: accounts } = useAccounts();
  const { data: tags } = useTags();
  // Category filter always lists one type's tree — income if that's the active
  // type filter, expense otherwise (categories don't apply to transfers).
  const { data: categoryTree } = useCategoryTree(type === 'income' ? 'income' : 'expense');

  const filters = useMemo(
    () => ({
      type: type ?? undefined,
      categoryIds: categoryIds.length ? categoryIds : undefined,
      from: from ?? undefined,
      to: to ?? undefined,
      accountIds: accountIds.length ? accountIds : undefined,
      tagIds: tagIds.length ? tagIds : undefined,
      search: debouncedSearch || undefined,
      isCompleted: pendingOnly ? false : undefined,
    }),
    [type, categoryIds, from, to, accountIds, tagIds, debouncedSearch, pendingOnly],
  );
  const filtered = Boolean(
    type ||
    categoryIds.length ||
    from ||
    accountIds.length ||
    tagIds.length ||
    debouncedSearch ||
    pendingOnly,
  );

  const { data: transactions, isLoading, isRefetching, refetch, error } = useTransactions(filters);
  const sections = useMemo(() => groupByDay(transactions ?? []), [transactions]);

  const clearAll = () => {
    setType(null);
    setCategoryIds([]);
    setFrom(null);
    setTo(null);
    setAccountIds([]);
    setTagIds([]);
    setPendingOnly(false);
    setSearch('');
  };

  const categoryOptions = useMemo(
    () =>
      (categoryTree ?? []).flatMap((p) => [
        { value: p.id, label: resolveCategoryLabel(p), dotColor: p.color, icon: p.icon },
        ...p.children.map((c) => ({
          value: c.id,
          label: `${resolveCategoryLabel(p)} › ${resolveCategoryLabel(c)}`,
          dotColor: c.color ?? p.color,
          icon: c.icon ?? p.icon,
        })),
      ]),
    [categoryTree],
  );
  const accountOptions = useMemo(
    () => (accounts ?? []).map((a) => ({ value: a.id, label: a.name })),
    [accounts],
  );
  const tagOptions = useMemo(
    () =>
      (tags ?? [])
        .filter((t) => !t.archived)
        .map((t) => ({ value: t.id, label: t.name, dotColor: t.color })),
    [tags],
  );

  const activeFilterCount = [
    Boolean(type),
    categoryIds.length > 0,
    accountIds.length > 0,
    tagIds.length > 0,
    Boolean(from),
    pendingOnly,
  ].filter(Boolean).length;

  return (
    <Screen edges={['top']} className="gap-3">
      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
            {pendingOnly
              ? from && !to
                ? 'Próximos'
                : 'Pendientes'
              : type
                ? TITLE[type]
                : 'Movimientos'}
          </Text>
          {filtered ? (
            <Pressable onPress={clearAll} hitSlop={8}>
              <Text className="text-[13px] font-semibold text-danger dark:text-danger-dark">
                × Limpiar filtros
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {filtered ? null : <FavoritesRow />}

      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <TextField
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por descripción…"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        <Pressable
          onPress={() => setFiltersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Filtros"
          className={`h-[52px] w-[52px] items-center justify-center rounded-ctl border ${
            activeFilterCount > 0
              ? 'border-lime bg-lime'
              : 'border-line bg-surface dark:border-line-dark dark:bg-surface-dark'
          }`}
        >
          <ListFilter size={20} color={activeFilterCount > 0 ? ICON_COLORS.ink : ICON_COLORS.ink3} />
          {activeFilterCount > 0 ? (
            <View className="absolute -right-1.5 -top-1.5 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-canvas bg-ink px-1 dark:border-canvas-dark dark:bg-lime">
              <Text className="text-[10px] font-bold text-lime dark:text-ink">
                {activeFilterCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {isLoading ? (
        <ScrollView className="flex-1" contentContainerClassName="pb-4" showsVerticalScrollIndicator={false}>
          <TransactionsSkeleton />
        </ScrollView>
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, 'No se pudieron cargar los movimientos')} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.id}
          className="flex-1"
          contentContainerClassName={sections.length === 0 ? 'grow pb-4' : 'pb-4'}
          stickySectionHeadersEnabled
          // Android's view-recycling optimization for offscreen rows has a
          // well-documented bug where a row can render blank (but still
          // count toward layout/totals) right after the list's data changes
          // — exactly what inserting a new transaction does.
          removeClippedSubviews={false}
          // `removeClippedSubviews={false}` above keeps every rendered row's
          // native view fully attached instead of detaching off-screen ones
          // — fine for a short list, but at real scale (users with
          // thousands of rows) the default `windowSize` of 21 "screens"
          // keeps far more of these (gesture handler + several Animated
          // values each) mounted at once than this row actually needs — and
          // every mounted row is native views the screen re-attaches each
          // time you come back to this tab. Tightened (2 screens of rows
          // above/below the viewport) specifically to bound that,
          // independent of the clipping workaround above.
          windowSize={5}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          ItemSeparatorComponent={RowSeparator}
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-center justify-between bg-canvas pb-2 pt-4 dark:bg-canvas-dark">
              <Text className="text-[13px] font-bold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
                {dayHeaderLabel(section.date)}
              </Text>
              <Text className="text-[13px] font-semibold text-ink-2 dark:text-ink-2-dark">
                {section.nets
                  .map((n) =>
                    section.nets.length > 1
                      ? `${formatCurrency(n.net, n.currency)} ${n.currency}`
                      : formatCurrency(n.net, n.currency),
                  )
                  .join(' · ')}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              illustration={<TransactionsEmptyIllustration />}
              title="Sin movimientos"
              description={
                filtered
                  ? 'No hay movimientos con estos filtros.'
                  : 'Toca el botón + para registrar el primero.'
              }
            />
          }
          renderItem={({ item, index, section }) => {
            const isFirst = index === 0;
            const isLast = index === section.data.length - 1;
            const row = (
              <View
                className={`overflow-hidden border-x border-line dark:border-line-dark ${
                  isFirst ? 'rounded-t-2xl border-t' : ''
                } ${isLast ? 'rounded-b-2xl border-b' : ''}`}
              >
                <TransactionListItem
                  transaction={item}
                  onPress={goToTransaction}
                  onEdit={goToEditTransaction}
                  isOpen={openRowId === item.id}
                  onReveal={handleRowReveal}
                />
              </View>
            );
            return section === sections[0] && index < STAGGERED_ROWS ? (
              <StaggerItem index={index}>{row}</StaggerItem>
            ) : (
              row
            );
          }}
        />
      )}

      <FiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        type={type}
        onTypeChange={(v) => {
          setType(v);
          setCategoryIds([]);
        }}
        categoryIds={categoryIds}
        onCategoryIdsChange={setCategoryIds}
        categoryOptions={categoryOptions}
        accountIds={accountIds}
        onAccountIdsChange={setAccountIds}
        accountOptions={accountOptions}
        tagIds={tagIds}
        onTagIdsChange={setTagIds}
        tagOptions={tagOptions}
        from={from}
        to={to}
        onDateChange={(f, t) => {
          setFrom(f);
          setTo(t);
        }}
        filtered={filtered}
        onClearAll={clearAll}
      />
    </Screen>
  );
}
