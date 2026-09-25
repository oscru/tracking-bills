import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useCategoryTree, useTags, useTransactions } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionType } from '@repo/core/types';
import { formatCurrency, toFriendlyMessage } from '@repo/core/utils';
import { ErrorCard, Fab, Screen, TextField } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from 'react-native';

import { dayHeaderLabel, groupByDay } from '../../../../features/transactions/day-groups';
import { FiltersSheet } from '../../../../features/transactions/filters-sheet';
import { TransactionListItem } from '../../../../features/transactions/transaction-list-item';

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
  }>();

  const [type, setType] = useState<TransactionType | null>(params.type ?? null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [from, setFrom] = useState<string | null>(params.from ?? null);
  const [to, setTo] = useState<string | null>(params.to ?? null);
  const [accountIds, setAccountIds] = useState<string[]>(
    params.accountId ? [params.accountId] : [],
  );
  const [tagIds, setTagIds] = useState<string[]>(params.tagId ? [params.tagId] : []);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Tabs stay mounted, so a repeat push (e.g. a different month's card from
  // Home) only changes `params` — re-apply the nav filters whenever they do.
  const navParamsKey = `${params.type ?? ''}|${params.from ?? ''}|${params.to ?? ''}|${params.accountId ?? ''}|${params.tagId ?? ''}`;
  const [appliedNavParamsKey, setAppliedNavParamsKey] = useState(navParamsKey);
  if (navParamsKey !== appliedNavParamsKey) {
    setAppliedNavParamsKey(navParamsKey);
    setType(params.type ?? null);
    setCategoryIds([]);
    setFrom(params.from ?? null);
    setTo(params.to ?? null);
    setAccountIds(params.accountId ? [params.accountId] : []);
    setTagIds(params.tagId ? [params.tagId] : []);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

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
    }),
    [type, categoryIds, from, to, accountIds, tagIds, debouncedSearch],
  );
  const filtered = Boolean(
    type || categoryIds.length || from || accountIds.length || tagIds.length || debouncedSearch,
  );

  const { data: transactions, isLoading, isRefetching, refetch, error } = useTransactions(filters);

  const currency = accounts?.[0]?.currency ?? 'MXN';
  const sections = useMemo(() => groupByDay(transactions ?? []), [transactions]);

  const clearAll = () => {
    setType(null);
    setCategoryIds([]);
    setFrom(null);
    setTo(null);
    setAccountIds([]);
    setTagIds([]);
    setSearch('');
  };

  const categoryOptions = useMemo(
    () =>
      (categoryTree ?? []).flatMap((p) => [
        { value: p.id, label: resolveCategoryLabel(p), dotColor: p.color },
        ...p.children.map((c) => ({
          value: c.id,
          label: `${resolveCategoryLabel(p)} › ${resolveCategoryLabel(c)}`,
          dotColor: c.color ?? p.color,
        })),
      ]),
    [categoryTree],
  );
  const accountOptions = useMemo(
    () => (accounts ?? []).map((a) => ({ value: a.id, label: a.name })),
    [accounts],
  );
  const tagOptions = useMemo(
    () => (tags ?? []).filter((t) => !t.archived).map((t) => ({ value: t.id, label: t.name, dotColor: t.color })),
    [tags],
  );

  const activeFilterCount = [
    Boolean(type),
    categoryIds.length > 0,
    accountIds.length > 0,
    tagIds.length > 0,
    Boolean(from),
  ].filter(Boolean).length;

  return (
    <Screen className="gap-3">
      <View className="gap-1 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
            {type ? TITLE[type] : 'Movimientos'}
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
          <Ionicons
            name="funnel-outline"
            size={20}
            color={activeFilterCount > 0 ? '#1A1D21' : '#9CA3AF'}
          />
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
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, 'No se pudieron cargar los movimientos')} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.id}
          className="flex-1"
          contentContainerClassName="pb-24"
          stickySectionHeadersEnabled
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          ItemSeparatorComponent={() => (
            <View className="border-x border-line bg-canvas px-3 dark:border-line-dark dark:bg-canvas-dark">
              <View className="h-px bg-line dark:bg-line-dark" />
            </View>
          )}
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-center justify-between bg-canvas pb-2 pt-4 dark:bg-canvas-dark">
              <Text className="text-[13px] font-bold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
                {dayHeaderLabel(section.date)}
              </Text>
              <Text className="text-[13px] font-semibold text-ink-2 dark:text-ink-2-dark">
                {formatCurrency(section.net, currency)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View className="mt-16 items-center gap-1">
              <Ionicons name="search-outline" size={28} color="#9CA3AF" />
              <Text className="mt-2 text-base font-semibold text-ink dark:text-ink-dark">
                Sin movimientos
              </Text>
              <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
                {filtered
                  ? 'No hay movimientos con estos filtros.'
                  : 'Toca el botón + para registrar el primero.'}
              </Text>
            </View>
          }
          renderItem={({ item, index, section }) => {
            const isFirst = index === 0;
            const isLast = index === section.data.length - 1;
            return (
              <View
                className={`border-x border-line px-3 dark:border-line-dark ${
                  isFirst ? 'rounded-t-2xl border-t' : ''
                } ${isLast ? 'rounded-b-2xl border-b' : ''}`}
              >
                <TransactionListItem
                  transaction={item}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/transactions/[id]',
                      params: { id: item.id },
                    })
                  }
                />
              </View>
            );
          }}
        />
      )}

      <View className="absolute bottom-6 right-5">
        <Fab
          accessibilityLabel="Nuevo movimiento"
          onPress={() => router.push('/(app)/new-transaction')}
        />
      </View>

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
