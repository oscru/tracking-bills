/**
 * Supabase data layer: the shared client plus typed query/mutation functions.
 * React components consume these through the hooks in `@repo/core/hooks`.
 */
export { supabase } from './client';
export { SupabaseError } from './internal';

export * from './auth';
export * from './accounts';
export * from './budgets';
export * from './categories';
export * from './favorite-transactions';
export * from './goals';
export * from './profiles';
export * from './tags';
export * from './transactions';
