import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getProfile, updateProfile } from '../supabase';
import type { Profile } from '../types';
import type { ProfileUpdateInput } from '../validators';
import { queryKeys } from './keys';

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.detail(),
    queryFn: getProfile,
  });
}

/**
 * Optimistic: applies `patch` to the cached profile immediately (e.g. so a
 * reorder in the home-layout screen feels instant), rolling back if the
 * write fails, and reconciling with the server either way.
 */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfileUpdateInput) => updateProfile(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: queryKeys.profile.detail() });
      const previous = qc.getQueryData<Profile>(queryKeys.profile.detail());
      if (previous) {
        qc.setQueryData<Profile>(queryKeys.profile.detail(), { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) qc.setQueryData(queryKeys.profile.detail(), context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.profile.all }),
  });
}
