import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  listGoalTransactions,
  listReceivedPeerTransfers,
  listTransactionsPage,
  updateTransaction,
  type TransactionPage,
  type TransactionFilters,
  type TransactionWithRefs,
} from '../supabase';
import type { TransactionUpdateInput } from '../validators';
import { queryKeys } from './keys';
import { budgetPeriodRange } from '../utils';
import type { BudgetWithCategories } from '../supabase';
import { useMemo } from 'react';

export function useTransactions(
  filters: TransactionFilters = {},
  {
    enabled = true,
    keepPrevious = false,
  }: {
    enabled?: boolean;
    /** Keep showing the previous filters' rows while new ones load (e.g. paging a period). */
    keepPrevious?: boolean;
  } = {},
) {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: () => listTransactions(filters),
    enabled,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });
}

/**
 * The filtered list in pages of whole days, newest first — for long lists
 * (Movimientos) that shouldn't download the whole history up front. Call
 * `fetchNextPage()` as the user nears the end.
 */
export function useTransactionPages(filters: TransactionFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.transactions.pages(filters),
    queryFn: ({ pageParam }) => listTransactionsPage(filters, { before: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore,
  });
}

/** Transfers linked people sent you since `since` (YYYY-MM-DD). */
export function useReceivedPeerTransfers(since: string) {
  return useQuery({
    queryKey: queryKeys.transactions.received(since),
    queryFn: () => listReceivedPeerTransfers(since),
  });
}

/** Movements involving savings goals, any status (see `listGoalTransactions`). */
export function useGoalTransactions(linkedAccountIds: readonly string[], { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.goals(linkedAccountIds),
    queryFn: () => listGoalTransactions(linkedAccountIds),
    enabled,
  });
}

/**
 * The settled expenses budgets can count right now: from the start of the
 * earliest active budget's current period on — all `budgetProgress` ever
 * reads. Shared by budget progress and budget notifications (same filters,
 * same cache entry). No active budgets, no fetch.
 */
export function useBudgetSpendTransactions(
  budgets: BudgetWithCategories[] | undefined,
  {
    includeArchived = false,
  }: {
    /** Also cover archived budgets (screens that show their progress too). */
    includeArchived?: boolean;
  } = {},
) {
  const from = useMemo(() => {
    const now = new Date();
    let earliest: string | null = null;
    for (const budget of budgets ?? []) {
      if (budget.archived && !includeArchived) continue;
      const start = budgetPeriodRange(budget, now).from;
      if (earliest == null || start < earliest) earliest = start;
    }
    return earliest;
  }, [budgets, includeArchived]);
  const filters = useMemo(
    () => ({ from: from ?? undefined, type: 'expense' as const, isCompleted: true }),
    [from],
  );
  const query = useTransactions(filters, { enabled: from != null });
  // Loaded budgets with nothing active: settled as "no spends".
  const none = budgets != null && from == null;
  return { ...query, data: none ? EMPTY : query.data, isLoading: none ? false : query.isLoading };
}

const EMPTY: TransactionWithRefs[] = [];

export function useTransaction(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn: () => getTransaction(id),
    enabled: Boolean(id),
    // Opening a transaction from a list you've already loaded shouldn't
    // show a spinner for data you were just looking at a second ago — the
    // list and detail endpoints select the same columns (`WITH_REFS`), so
    // any cached `transactions.list(...)` query (any filter combo) is a
    // valid instant seed. Still refetches in the background as normal
    // (`initialData` alone doesn't mark it fresh forever, just gives the
    // first paint something real to show).
    initialData: () => {
      // Scoped to `['transactions', 'list']` specifically (not `.all`,
      // which also prefix-matches `['transactions', 'detail', id]` entries
      // — those hold a single object, not an array, and would break `.find`).
      const cached = qc.getQueriesData<TransactionWithRefs[]>({
        queryKey: ['transactions', 'list'],
      });
      for (const [, list] of cached) {
        const match = list?.find((t) => t.id === id);
        if (match) return match;
      }
      // …and the paged lists (Movimientos).
      const paged = qc.getQueriesData<InfiniteData<TransactionPage>>({
        queryKey: ['transactions', 'pages'],
      });
      for (const [, data] of paged) {
        for (const page of data?.pages ?? []) {
          const match = page.rows.find((t) => t.id === id);
          if (match) return match;
        }
      }
      return undefined;
    },
  });
}

function invalidateTransactions(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
  // Account balances are derived from transactions.
  qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => invalidateTransactions(qc),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TransactionUpdateInput }) =>
      updateTransaction(id, patch),
    onSuccess: (_data, { id }) => {
      invalidateTransactions(qc);
      qc.invalidateQueries({ queryKey: queryKeys.transactions.detail(id) });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => invalidateTransactions(qc),
  });
}
