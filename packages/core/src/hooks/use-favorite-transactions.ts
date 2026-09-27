import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createFavoriteTransaction,
  deleteFavoriteTransaction,
  listFavoriteTransactions,
  updateFavoriteTransaction,
} from '../supabase';
import type { FavoriteTransactionUpdateInput } from '../validators';
import { queryKeys } from './keys';

export function useFavoriteTransactions() {
  return useQuery({
    queryKey: queryKeys.favoriteTransactions.list(),
    queryFn: () => listFavoriteTransactions(),
  });
}

export function useCreateFavoriteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFavoriteTransaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.favoriteTransactions.all }),
  });
}

export function useUpdateFavoriteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FavoriteTransactionUpdateInput }) =>
      updateFavoriteTransaction(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.favoriteTransactions.all }),
  });
}

export function useDeleteFavoriteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFavoriteTransaction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.favoriteTransactions.all }),
  });
}
