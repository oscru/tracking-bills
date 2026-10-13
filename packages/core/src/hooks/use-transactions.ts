import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
  type TransactionFilters,
  type TransactionWithRefs,
} from '../supabase';
import type { TransactionUpdateInput } from '../validators';
import { queryKeys } from './keys';

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: () => listTransactions(filters),
  });
}

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
