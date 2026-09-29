/**
 * The Home screen's optional, user-orderable cards — in their default order.
 * The month selector, the "Balance total" card, and the income/expense
 * totals card are the screen's anchor and are deliberately not in this
 * list: they're always shown, always first, never reorderable.
 *
 * Deliberately dependency-free (no imports) — both `utils` and `validators`
 * need this, and importing it from `utils` created a require cycle back
 * through `supabase/auth.ts` -> `validators` -> `utils`.
 */
export const HOME_LAYOUT_ITEMS = [
  'pending',
  'upcoming',
  'budgets',
  'categorySpend',
  'monthlyTrend',
  'accounts',
] as const;

export type HomeLayoutItem = (typeof HOME_LAYOUT_ITEMS)[number];
