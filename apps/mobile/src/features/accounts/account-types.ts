import { Ionicons } from '@expo/vector-icons';
import type { AccountType } from '@repo/core/types';

export const ACCOUNT_TYPES: {
  value: AccountType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'investment', label: 'Inversión', icon: 'trending-up-outline' },
  { value: 'credit', label: 'Crédito', icon: 'card-outline' },
  { value: 'debit', label: 'Débito', icon: 'card' },
  { value: 'savings', label: 'Ahorros', icon: 'wallet-outline' },
  { value: 'loan', label: 'Préstamos', icon: 'business-outline' },
];

export const ACCOUNT_TYPE_LABEL = Object.fromEntries(
  ACCOUNT_TYPES.map((t) => [t.value, t.label]),
) as Record<AccountType, string>;

export const ACCOUNT_TYPE_ICON = Object.fromEntries(
  ACCOUNT_TYPES.map((t) => [t.value, t.icon]),
) as Record<AccountType, keyof typeof Ionicons.glyphMap>;
