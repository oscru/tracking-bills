import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createCategory, deleteCategory, listCategories, updateCategory } from '../supabase';
import type { Category, TransactionType } from '../types';
import type { CategoryUpdateInput } from '../validators';
import { queryKeys } from './keys';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: () => listCategories(),
  });
}

/** Categories of one type (income/expense), defaults and custom together. */
export function useCategoriesByType(type: TransactionType) {
  const query = useCategories();
  const data = useMemo<Category[] | undefined>(
    () => query.data?.filter((c) => c.type === type),
    [query.data, type],
  );
  return { ...query, data };
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories.all }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CategoryUpdateInput }) =>
      updateCategory(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories.all }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.categories.all });
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
  });
}
