import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useCategoryTree, useTransactions } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { TransactionType } from '@repo/core/types';
import { formatCurrency } from '@repo/core/utils';
import { Chip, Fab, Screen, TextField } from '@repo/ui';
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

import { dayHeaderLabel, groupByDay } from '../../../features/transactions/day-groups';
import { DateRangeField } from '../../../features/transactions/date-range-field';
import { FilterOptionSheet } from '../../../features/transactions/filter-option-sheet';
import { MultiSelectSheet } from '../../../features/transactions/multi-select-sheet';
import { TransactionListItem } from '../../../features/transactions/transaction-list-item';

const TITLE: Record<TransactionType, string> = {
  income: 'Ingresos',
  expense: 'Gastos',
  transfer: 'Transferencias',
};

const TYPE_OPTIONS = [
  { value: 'income', label: 'Ingresos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'transfer', label: 'Transferencias' },
];

function pluralLabel(count: number, noun: string, pluralNoun: string): string {
  return `${count} ${count === 1 ? noun : pluralNoun} seleccionada${count === 1 ? '' : 's'}`;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: TransactionType;
    from?: string;
    to?: string;
    accountId?: string;
  }>();

  const [type, setType] = useState<TransactionType | null>(params.type ?? null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [from, setFrom] = useState<string | null>(params.from ?? null);
  const [to, setTo] = useState<string | null>(params.to ?? null);
  const [accountIds, setAccountIds] = useState<string[]>(
    params.accountId ? [params.accountId] : [],
  );
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data: accounts } = useAccounts();
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
      search: debouncedSearch || undefined,
    }),
    [type, categoryIds, from, to, accountIds, debouncedSearch],
  );
  const filtered = Boolean(
    type || categoryIds.length || from || accountIds.length || debouncedSearch,
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

  const categoryLabel =
    categoryIds.length === 0
      ? 'Categoría'
      : pluralLabel(categoryIds.length, 'categoría', 'categorías');
  const accountLabel =
    accountIds.length === 0 ? 'Cuenta' : pluralLabel(accountIds.length, 'cuenta', 'cuentas');

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

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por descripción…"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      <View className="flex-row flex-wrap gap-2">
        <Chip
          label={type ? TITLE[type] : 'Tipo'}
          selected={Boolean(type)}
          onPress={() => setTypeSheetOpen(true)}
        />
        <Chip
          label={categoryLabel}
          selected={categoryIds.length > 0}
          onPress={() => setCategorySheetOpen(true)}
        />
        <Chip
          label={accountLabel}
          selected={accountIds.length > 0}
          onPress={() => setAccountSheetOpen(true)}
        />
        <DateRangeField
          from={from}
          to={to}
          onChange={(f, t) => {
            setFrom(f);
            setTo(t);
          }}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <Text className="mt-8 text-center text-sm text-danger dark:text-danger-dark">
          {error.message}
        </Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.id}
          className="flex-1"
          contentContainerClassName="pb-24"
          stickySectionHeadersEnabled
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          ItemSeparatorComponent={() => <View className="h-px bg-line dark:bg-line-dark" />}
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
          renderItem={({ item }) => (
            <TransactionListItem
              transaction={item}
              onPress={() =>
                router.push({
                  pathname: '/(app)/transactions/[id]',
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      )}

      <View className="absolute bottom-6 right-5">
        <Fab
          accessibilityLabel="Nuevo movimiento"
          onPress={() => router.push('/(app)/transactions/new')}
        />
      </View>

      <FilterOptionSheet
        visible={typeSheetOpen}
        onClose={() => setTypeSheetOpen(false)}
        title="Tipo de movimiento"
        allLabel="Todos los tipos"
        options={TYPE_OPTIONS}
        value={type}
        onSelect={(v) => {
          setType(v as TransactionType | null);
          setCategoryIds([]);
        }}
      />
      <MultiSelectSheet
        visible={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        title="Categoría"
        options={categoryOptions}
        values={categoryIds}
        onChange={setCategoryIds}
      />
      <MultiSelectSheet
        visible={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        title="Cuenta"
        options={accountOptions}
        values={accountIds}
        onChange={setAccountIds}
      />
    </Screen>
  );
}
