import type { Account } from '../types';
import {
  accountCreateSchema,
  accountUpdateSchema,
  type AccountCreateInput,
  type AccountUpdateInput,
} from '../validators';
import { supabase } from './client';
import { SupabaseError, unwrap } from './internal';

/** Active accounts first, then by creation order. */
export async function listAccounts(): Promise<Account[]> {
  return unwrap(
    await supabase
      .from('accounts')
      .select('*')
      .order('archived', { ascending: true })
      .order('created_at', { ascending: true }),
  ) as Account[];
}

export async function createAccount(input: AccountCreateInput): Promise<Account> {
  const payload = accountCreateSchema.parse(input);
  return unwrap(await supabase.from('accounts').insert(payload).select().single()) as Account;
}

export async function updateAccount(id: string, patch: AccountUpdateInput): Promise<Account> {
  const payload = accountUpdateSchema.parse(patch);
  return unwrap(
    await supabase.from('accounts').update(payload).eq('id', id).select().single(),
  ) as Account;
}

export function archiveAccount(id: string): Promise<Account> {
  return updateAccount(id, { archived: true });
}

/** Hard delete. Fails if transactions still reference the account (FK restrict). */
export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw new SupabaseError(error);
}
