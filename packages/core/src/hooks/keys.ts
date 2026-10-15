import type { TransactionFilters } from '../supabase';

/** Central query-key factory so invalidation stays consistent. */
export const queryKeys = {
  session: ['session'] as const,
  profile: {
    all: ['profile'] as const,
    detail: () => ['profile', 'detail'] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    list: () => ['accounts', 'list'] as const,
    peers: () => ['accounts', 'peers'] as const,
  },
  peers: {
    all: ['peers'] as const,
    list: () => ['peers', 'list'] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: () => ['categories', 'list'] as const,
  },
  tags: {
    all: ['tags'] as const,
    list: () => ['tags', 'list'] as const,
  },
  favoriteTransactions: {
    all: ['favoriteTransactions'] as const,
    list: () => ['favoriteTransactions', 'list'] as const,
  },
  budgets: {
    all: ['budgets'] as const,
    list: () => ['budgets', 'list'] as const,
  },
  goals: {
    all: ['goals'] as const,
    list: () => ['goals', 'list'] as const,
  },
  notificationReads: {
    all: ['notificationReads'] as const,
    list: () => ['notificationReads', 'list'] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (filters: TransactionFilters = {}) => ['transactions', 'list', filters] as const,
    detail: (id: string) => ['transactions', 'detail', id] as const,
    received: (since: string) => ['transactions', 'received', since] as const,
    pages: (filters: TransactionFilters = {}) => ['transactions', 'pages', filters] as const,
    // Server-side aggregates (see supabase/summaries.ts). Under the
    // `transactions` prefix on purpose: every transaction mutation already
    // invalidates `transactions.all`, which refreshes these too.
    balanceEffects: () => ['transactions', 'summary', 'balanceEffects'] as const,
    monthlyTotals: () => ['transactions', 'summary', 'monthlyTotals'] as const,
    dailyTotals: () => ['transactions', 'summary', 'dailyTotals'] as const,
    tagCounts: () => ['transactions', 'summary', 'tagCounts'] as const,
    netBefore: (accountId: string, date: string | null, createdAt: string | null) =>
      ['transactions', 'summary', 'netBefore', accountId, date, createdAt] as const,
    goals: (linkedAccountIds: readonly string[]) =>
      ['transactions', 'goals', [...linkedAccountIds].sort()] as const,
    accountCounts: (accountId: string) =>
      ['transactions', 'summary', 'accountCounts', accountId] as const,
    categoryDailyTotals: (categoryIds: readonly string[]) =>
      ['transactions', 'summary', 'categoryDailyTotals', [...categoryIds].sort()] as const,
  },
} as const;
