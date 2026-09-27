import { z } from 'zod';

const uuid = z.string().uuid();
const amount = z.number().positive('Must be greater than 0').finite();
const description = z.string().trim().max(280).nullish();
// income/expense favorites must be categorized — only a transfer has none,
// same rule as `transactionCreateSchema`.
const requiredCategoryId = z
  .string({ required_error: 'Elige una categoría', invalid_type_error: 'Elige una categoría' })
  .uuid('Elige una categoría');

const commonFields = {
  label: z.string().trim().min(1, 'Ponle un nombre').max(40),
  /** An Ionicons glyph name (`Ionicons.glyphMap` key). */
  icon: z.string().trim().min(1, 'Elige un ícono'),
  account_id: uuid,
  // Omitted -> "monto libre": the amount step opens empty instead of prefilled.
  amount: amount.nullish(),
  description,
};

/**
 * Create payload — a discriminated union on `type`, same shape as
 * `transactionCreateSchema`: income/expense carry a required `category_id`;
 * a transfer carries a required `to_account_id` and no category.
 */
export const favoriteTransactionCreateSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('income'), category_id: requiredCategoryId, ...commonFields }),
  z.object({ type: z.literal('expense'), category_id: requiredCategoryId, ...commonFields }),
  z.object({ type: z.literal('transfer'), to_account_id: uuid, ...commonFields }),
]);

/**
 * Update payload — a loose partial, same rationale as `transactionUpdateSchema`:
 * the DB CHECK + integrity trigger enforce the real invariants.
 */
export const favoriteTransactionUpdateSchema = z.object({
  label: z.string().trim().min(1, 'Ponle un nombre').max(40).optional(),
  icon: z.string().trim().min(1, 'Elige un ícono').optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  account_id: uuid.optional(),
  to_account_id: uuid.nullish(),
  category_id: uuid.nullish(),
  amount: amount.nullish(),
  description,
});

export type FavoriteTransactionCreateInput = z.infer<typeof favoriteTransactionCreateSchema>;
export type FavoriteTransactionUpdateInput = z.infer<typeof favoriteTransactionUpdateSchema>;
