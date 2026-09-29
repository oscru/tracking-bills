import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createGoal, deleteGoal, listGoals, updateGoal } from '../supabase';
import type { GoalUpdateInput } from '../validators';
import { queryKeys } from './keys';

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals.list(),
    queryFn: () => listGoals(),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGoal,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goals.all }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: GoalUpdateInput }) => updateGoal(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goals.all }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goals.all }),
  });
}
