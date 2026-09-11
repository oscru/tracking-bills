/**
 * TanStack Query hooks over the Supabase data layer.
 * Wrap the app in `<QueryClientProvider client={createQueryClient()}>` and
 * `<SessionProvider>`.
 */
export { createQueryClient } from './query-client';
export { queryKeys } from './keys';

export { SessionProvider, useSession, type SessionState } from './session-context';
export { useSignIn, useSignUp, useSignOut } from './use-auth';
export { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from './use-accounts';
export {
  useCategories,
  useCategoriesByType,
  useCategoryTree,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './use-categories';
export {
  useTransactions,
  useTransaction,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from './use-transactions';
