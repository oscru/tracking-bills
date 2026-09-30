/**
 * Domain types.
 *
 * `database.ts` is generated from the live schema:
 *   pnpm db:gen-types   (root)  /  pnpm --filter @repo/core gen:types
 * Do not edit it by hand.
 */
import type { Database } from './database';

export type { Database };
export type { Json } from './database';

type PublicSchema = Database['public'];
type TableName = keyof PublicSchema['Tables'];

/** Row shape of a public table, e.g. `Row<'transactions'>`. */
export type Row<T extends TableName> = PublicSchema['Tables'][T]['Row'];
/** Insert payload for a public table. */
export type InsertRow<T extends TableName> = PublicSchema['Tables'][T]['Insert'];
/** Update payload for a public table. */
export type UpdateRow<T extends TableName> = PublicSchema['Tables'][T]['Update'];

// Domain enums (mirrored from the CHECK constraints; kept as unions because the
// schema models them as text, not Postgres enums).
export type Plan = 'free' | 'premium';
export type AccountType =
  | 'investment'
  | 'credit'
  | 'debit'
  | 'savings'
  | 'loan'
  | 'cash'
  | 'credit_card';

/** A movement (transaction) is income, expense, or a transfer between accounts. */
export type TransactionType = 'income' | 'expense' | 'transfer';
/** Categories only classify income and expense — never transfers. */
export type CategoryType = 'income' | 'expense';

/** Overrides the OS light/dark setting when not "system". */
export type ThemePreference = 'system' | 'light' | 'dark';

// Row aliases, with the loose `text` columns narrowed to their domain unions.
export type Profile = Omit<Row<'profiles'>, 'plan' | 'theme_preference'> & {
  plan: Plan;
  theme_preference: ThemePreference;
};
export type Account = Omit<Row<'accounts'>, 'type'> & { type: AccountType };
export type Category = Omit<Row<'categories'>, 'type'> & { type: CategoryType };
export type Transaction = Omit<Row<'transactions'>, 'type'> & {
  type: TransactionType;
};
/** A user-defined label attachable to any transaction. Retired via `archived`. */
export type Tag = Row<'tags'>;
/** A saved shortcut that prefills the movement form — not a historical record. */
export type FavoriteTransaction = Omit<Row<'favorite_transactions'>, 'type'> & {
  type: TransactionType;
};
/**
 * How often a budget's limit resets. "biweekly" is calendar days 1-15 and
 * 16-end of month. "custom" is a one-off explicit `start_date`/`end_date`
 * range instead of a recurring occurrence.
 */
export type BudgetPeriodType = 'weekly' | 'biweekly' | 'monthly' | 'custom';
/** A named spending envelope covering one or more categories (see `BudgetCategory`) — always expense-scoped. */
export type Budget = Omit<Row<'budgets'>, 'period_type'> & { period_type: BudgetPeriodType };
/** A category linked to a budget — a category can belong to several budgets at once. */
export type BudgetCategory = Row<'budget_categories'>;
/** A savings target — not a real account, but a transfer can be aimed at one (see `Transaction.goal_id`). Progress is derived from those transfers, not stored. */
export type Goal = Row<'goals'>;
/** Per-tag transaction counts, split the way the tag list displays them. */
export interface TagCounts {
  expense: number;
  income: number;
}

/** A category with its subcategories nested (one level only). */
export interface CategoryNode extends Category {
  children: Category[];
}

/** ISO 4217 currency code, e.g. 'MXN'. */
export type CurrencyCode = string;

/** The subset of a category row the UI needs to render a label. */
export interface CategoryLabelSource {
  name: string;
}
