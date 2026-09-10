import { z } from 'zod';

import { categoryTypeSchema } from './category';

/** income | expense — shared with categories. */
export const transactionTypeSchema = categoryTypeSchema;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const transactionCreateSchema = z.object({
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullish(),
  type: transactionTypeSchema,
  amount: z.number().positive('Must be greater than 0').finite(),
  description: z.string().trim().max(280).nullish(),
  // Omitted -> the DB defaults it to current_date.
  transaction_date: isoDateSchema.optional(),
});

export const transactionUpdateSchema = transactionCreateSchema.partial();

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
