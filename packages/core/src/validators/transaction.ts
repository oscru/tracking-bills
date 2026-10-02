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
 * income/expense carry a required `category_id`; a transfer carries no
 * category and exactly one destination — another account (`to_account_id`)
 * or a savings goal (`goal_id`), never both, never neither.
 */
export const transactionCreateSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('income'), category_id: requiredCategoryId, ...commonFields }),
    z.object({ type: z.literal('expense'), category_id: requiredCategoryId, ...commonFields }),
    z.object({
      type: z.literal('transfer'),
      to_account_id: uuid.optional(),
      goal_id: uuid.optional(),
      ...commonFields,
    }),
  ])
  .refine((v) => v.type !== 'transfer' || Boolean(v.to_account_id) !== Boolean(v.goal_id), {
    message: 'Elige una cuenta o un objetivo de destino',
    path: ['to_account_id'],
  });

/**
 * Update payload — a loose partial. The DB CHECK + integrity trigger enforce
 * the real invariants (transfer shape, account/category/goal ownership) —
 * including whether a `category_id` actually belongs to the new `type`,
 * which needs a DB lookup this schema can't do. The one thing checkable
 * structurally (no lookup needed) is caught here instead of round-tripping:
 * a transfer never carries a category, income/expense never carry a
 * transfer destination.
 */
export const transactionUpdateSchema = z
  .object({
    type: transactionTypeSchema.optional(),
    account_id: uuid.optional(),
    to_account_id: uuid.nullish(),
    goal_id: uuid.nullish(),
    category_id: uuid.nullish(),
    amount: amount.optional(),
    description,
    transaction_date,
    is_completed,
  })
  .refine((v) => v.type !== 'transfer' || !v.category_id, {
    message: 'Una transferencia no lleva categoría',
    path: ['category_id'],
  })
  .refine((v) => v.type == null || v.type === 'transfer' || (!v.to_account_id && !v.goal_id), {
    message: 'Solo una transferencia puede tener cuenta o meta destino',
    path: ['to_account_id'],
  });

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
