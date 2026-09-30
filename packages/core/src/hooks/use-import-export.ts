import { useMutation, useQueryClient } from '@tanstack/react-query';

import { runImportPlan, type ImportPlan } from '../import-export';
import { queryKeys } from './keys';

/** Executes an already-built `ImportPlan` — creates whatever catalog rows
 * are missing, then the transactions themselves. */
export function useRunImportPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plan, defaultCurrency }: { plan: ImportPlan; defaultCurrency: string }) =>
      runImportPlan(plan, { defaultCurrency }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
      qc.invalidateQueries({ queryKey: queryKeys.categories.all });
      qc.invalidateQueries({ queryKey: queryKeys.tags.all });
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
  });
}
