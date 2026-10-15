import { Ionicons } from '@expo/vector-icons';
import type { AccountType, OwnAccountType } from '@repo/core/types';

/** The types a user can pick when creating an account. */
export const ACCOUNT_TYPES: {
  value: OwnAccountType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'cash', label: 'Efectivo', icon: 'cash-outline' },
  { value: 'debit', label: 'Débito', icon: 'card-outline' },
  { value: 'credit_card', label: 'Tarjeta de crédito', icon: 'card' },
  { value: 'credit', label: 'Crédito', icon: 'trending-down-outline' },
  { value: 'investment', label: 'Inversión', icon: 'trending-up-outline' },
  { value: 'savings', label: 'Ahorros', icon: 'wallet-outline' },
  { value: 'loan', label: 'Préstamos', icon: 'business-outline' },
];

// Plus `contact` — a linked person in your ledger (never created by hand).
const CONTACT = { value: 'contact' as const, label: 'Persona', icon: 'person-outline' as const };

export const ACCOUNT_TYPE_LABEL = Object.fromEntries(
  [...ACCOUNT_TYPES, CONTACT].map((t) => [t.value, t.label]),
) as Record<AccountType, string>;

export const ACCOUNT_TYPE_ICON = Object.fromEntries(
  [...ACCOUNT_TYPES, CONTACT].map((t) => [t.value, t.icon]),
) as Record<AccountType, keyof typeof Ionicons.glyphMap>;
