import { z } from 'zod';

import { hexColorSchema } from './category';

export const accountTypeSchema = z.enum([
  'investment',
  'credit',
  'debit',
  'savings',
  'loan',
  'cash',
  'credit_card',
]);

export const currencyCodeSchema = z.string().trim().length(3, 'Use a 3-letter ISO currency code');

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(60),
  type: accountTypeSchema,
  currency: currencyCodeSchema.default('MXN'),
  initial_balance: z.number().finite().default(0),
  color: hexColorSchema.nullish(),
  /** Whether it appears in the "Tus cuentas" list on the home screen. */
  show_on_home: z.boolean().default(true),
});

export const accountUpdateSchema = accountCreateSchema
  .omit({ initial_balance: true })
  .partial()
  .extend({ archived: z.boolean().optional() });

export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
