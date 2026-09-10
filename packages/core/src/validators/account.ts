import { z } from 'zod';

export const accountTypeSchema = z.enum(['cash', 'bank', 'credit_card']);

export const currencyCodeSchema = z.string().trim().length(3, 'Use a 3-letter ISO currency code');

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(60),
  type: accountTypeSchema,
  currency: currencyCodeSchema.default('MXN'),
  initial_balance: z.number().finite().default(0),
});

export const accountUpdateSchema = accountCreateSchema
  .partial()
  .extend({ archived: z.boolean().optional() });

export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
