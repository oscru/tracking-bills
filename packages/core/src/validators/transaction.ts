import { z } from 'zod';

/** income | expense | transfer */
export const transactionTypeSchema = z.enum(['income', 'expense', 'transfer']);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const uuid = z.string().uuid();
// income/expense movements must be categorized — only a transfer has none.
const requiredCategoryId = z
  .string({ required_error: 'Elige una categoría', invalid_type_error: 'Elige una categoría' })
  .uuid('Elige una categoría');
const amount = z.number().positive('Must be greater than 0').finite();
const description = z.string().trim().max(280).nullish();
// Omitted -> the DB defaults it to current_date.
const transaction_date = isoDateSchema.optional();

// Omitted -> the DB defaults it to true (a movement is settled unless marked
// otherwise, e.g. a scheduled/planned payment).
const is_completed = z.boolean().optional();

const commonFields = { account_id: uuid, amount, description, transaction_date, is_completed };

/**
 * Create payload — a discriminated union on `type`:
 * income/expense carry a required `category_id`; a transfer carries a required
 * `to_account_id` (the destination) and no category.
 */
export const transactionCreateSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('income'), category_id: requiredCategoryId, ...commonFields }),
  z.object({ type: z.literal('expense'), category_id: requiredCategoryId, ...commonFields }),
  z.object({ type: z.literal('transfer'), to_account_id: uuid, ...commonFields }),
]);

/**
 * Update payload — a loose partial. The DB CHECK + integrity trigger enforce the
 * real invariants (transfer shape, account/category ownership).
 */
export const transactionUpdateSchema = z.object({
  type: transactionTypeSchema.optional(),
  account_id: uuid.optional(),
  to_account_id: uuid.nullish(),
  category_id: uuid.nullish(),
  amount: amount.optional(),
  description,
  transaction_date,
  is_completed,
});

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
