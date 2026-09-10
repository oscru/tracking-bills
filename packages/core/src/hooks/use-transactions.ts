import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
  type TransactionFilters,
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
  return useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn: () => getTransaction(id),
    enabled: Boolean(id),
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
