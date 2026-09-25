import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { archiveTag, createTag, deleteTag, listTags, setTransactionTags, updateTag } from '../supabase';
import type { TagUpdateInput } from '../validators';
import { queryKeys } from './keys';

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags.list(),
    queryFn: () => listTags(),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tags.all }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TagUpdateInput }) => updateTag(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tags.all }),
  });
}

export function useArchiveTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived?: boolean }) => archiveTag(id, archived),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tags.all }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags.all });
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
  });
}

/** Replace a transaction's tags. Called after create/update, not standalone. */
export function useSetTransactionTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, tagIds }: { transactionId: string; tagIds: string[] }) =>
      setTransactionTags(transactionId, tagIds),
    onSuccess: (_data, { transactionId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      qc.invalidateQueries({ queryKey: queryKeys.transactions.detail(transactionId) });
    },
  });
}
