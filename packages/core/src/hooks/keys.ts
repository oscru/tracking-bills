import type { TransactionFilters } from '../supabase';

/** Central query-key factory so invalidation stays consistent. */
export const queryKeys = {
  session: ['session'] as const,
  accounts: {
    all: ['accounts'] as const,
    list: () => ['accounts', 'list'] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: () => ['categories', 'list'] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (filters: TransactionFilters = {}) => ['transactions', 'list', filters] as const,
    detail: (id: string) => ['transactions', 'detail', id] as const,
  },
} as const;
