import { Ionicons } from '@expo/vector-icons';
import { i18n } from '@repo/core/i18n';
import type { AccountType, OwnAccountType } from '@repo/core/types';

/** The types a user can pick when creating an account (names: `accountTypeLabel`). */
export const ACCOUNT_TYPES: {
  value: OwnAccountType;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'cash', icon: 'cash-outline' },
  { value: 'debit', icon: 'card-outline' },
  { value: 'credit_card', icon: 'card' },
  { value: 'credit', icon: 'trending-down-outline' },
  { value: 'investment', icon: 'trending-up-outline' },
  { value: 'savings', icon: 'wallet-outline' },
  { value: 'loan', icon: 'business-outline' },
];

// Plus `contact` — a linked person in your ledger (never created by hand).
const CONTACT = { value: 'contact' as const, icon: 'person-outline' as const };

/** An account type's name in the current language (`accounts:types`). */
export function accountTypeLabel(type: AccountType): string {
  return i18n.t(`accounts:types.${type}`);
}

export const ACCOUNT_TYPE_ICON = Object.fromEntries(
  [...ACCOUNT_TYPES, CONTACT].map((t) => [t.value, t.icon]),
) as Record<AccountType, keyof typeof Ionicons.glyphMap>;
