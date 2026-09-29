import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createBudget, deleteBudget, listBudgets, updateBudget } from '../supabase';
import type { BudgetUpdateInput } from '../validators';
import { queryKeys } from './keys';

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets.list(),
    queryFn: () => listBudgets(),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBudget,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.budgets.all }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: BudgetUpdateInput }) => updateBudget(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.budgets.all }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.budgets.all }),
  });
}
