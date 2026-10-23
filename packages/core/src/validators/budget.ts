import { z } from 'zod';

import { currencyCodeSchema } from './account';

const name = z.string().trim().min(1, 'validation:nameGiven').max(60);
const amount = z.number().positive('validation:amountPositive').finite();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'validation:dateInvalid');

/** One category's share of the budget's total — `categories` is a list of these, not bare ids. */
const categoryAllocation = z.object({
  category_id: z.string().uuid(),
  amount: z.number().positive('validation:amountPositive').finite(),
});
const categories = z.array(categoryAllocation).min(1, 'validation:categoryRequired');

const commonFields = {
  name,
  amount,
  currency: currencyCodeSchema,
  categories,
  start_date: isoDate,
};

/**
 * Create payload — a discriminated union on `period_type`. Weekly/biweekly/
 * monthly are sized ranges anchored at `start_date`, with `repeats` deciding
 * whether a new one starts right after the last ends; 'custom' is always a
 * single explicit `start_date`/`end_date` range and can't repeat.
 */
export const budgetCreateSchema = z
  .discriminatedUnion('period_type', [
    z.object({ period_type: z.literal('weekly'), repeats: z.boolean(), ...commonFields }),
    z.object({ period_type: z.literal('biweekly'), repeats: z.boolean(), ...commonFields }),
    z.object({ period_type: z.literal('monthly'), repeats: z.boolean(), ...commonFields }),
    z.object({ period_type: z.literal('custom'), end_date: isoDate, ...commonFields }),
  ])
  .refine((v) => v.period_type !== 'custom' || v.end_date >= v.start_date, {
    message: 'validation:endAfterStart',
    path: ['end_date'],
  });

/**
 * Update payload — a loose partial, same rationale as `favoriteTransactionUpdateSchema`:
 * the DB CHECK constraint (`budgets_custom_shape`) enforces the real invariant.
 */
export const budgetUpdateSchema = z.object({
  name: name.optional(),
  amount: amount.optional(),
  period_type: z.enum(['weekly', 'biweekly', 'monthly', 'custom']).optional(),
  start_date: isoDate.optional(),
  end_date: isoDate.nullish(),
  repeats: z.boolean().optional(),
  archived: z.boolean().optional(),
  /** When present, replaces the budget's full set of linked categories and their allocations. */
  categories: categories.optional(),
});

export type CategoryAllocationInput = z.infer<typeof categoryAllocation>;
export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;
