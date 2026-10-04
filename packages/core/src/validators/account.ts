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

export const currencyCodeSchema = z.string().trim().length(3, 'Usa un código de divisa de 3 letras');

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre').max(60),
  type: accountTypeSchema,
  currency: currencyCodeSchema.default('MXN'),
  initial_balance: z.number().finite().default(0),
  color: hexColorSchema.nullish(),
  /** Whether it appears in the "Tus cuentas" list on the home screen. */
  show_on_home: z.boolean().default(true),
  /** Whether its balance counts toward the home screen's overall "Balance total". */
  include_in_total: z.boolean().default(true),
});

// `currency`, like `initial_balance`, is locked after creation — changing it
// would silently reinterpret every transaction already booked against the
// account instead of converting anything.
export const accountUpdateSchema = accountCreateSchema
  .omit({ initial_balance: true, currency: true })
  .partial()
  .extend({ archived: z.boolean().optional() });

export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
