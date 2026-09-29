import type { Budget, Category, InsertRow, UpdateRow } from '../types';
import {
  budgetCreateSchema,
  budgetUpdateSchema,
  type BudgetCreateInput,
  type BudgetUpdateInput,
  type CategoryAllocationInput,
} from '../validators';
import { supabase } from './client';
import { SupabaseError, unwrap } from './internal';

type CategoryRef = Pick<Category, 'id' | 'slug' | 'name' | 'icon' | 'color'>;

/** A budget category link with its own share of the total, category details embedded. */
export interface BudgetCategoryAllocation {
  category: CategoryRef;
  /** This category's share of the parent budget's total `amount`. */
  amount: number;
}

/** A budget with its linked categories (and each one's allocated share) embedded — everything the list/detail views need. */
export interface BudgetWithCategories extends Budget {
  categories: BudgetCategoryAllocation[];
}

interface RawBudgetRow extends Budget {
  budget_categories: { amount: number; category: CategoryRef | null }[];
}

const WITH_CATEGORIES = '*, budget_categories(amount, category:categories(id, slug, name, icon, color))';

function toBudgetWithCategories(row: RawBudgetRow): BudgetWithCategories {
  const { budget_categories, ...budget } = row;
  return {
    ...budget,
    categories: budget_categories
      .filter((bc): bc is { amount: number; category: CategoryRef } => bc.category != null)
      .map((bc) => ({ category: bc.category, amount: bc.amount })),
  };
}

/** Creation order — the order the user set them up in, oldest first. */
export async function listBudgets(): Promise<BudgetWithCategories[]> {
  const rows = unwrap(
    await supabase.from('budgets').select(WITH_CATEGORIES).order('created_at', { ascending: true }),
  ) as unknown as RawBudgetRow[];
  return rows.map(toBudgetWithCategories);
}

async function linkCategories(budgetId: string, categories: CategoryAllocationInput[]): Promise<void> {
  if (categories.length === 0) return;
  const { error } = await supabase.from('budget_categories').insert(
    categories.map(({ category_id, amount }) => ({ budget_id: budgetId, category_id, amount })),
  );
  if (error) throw new SupabaseError(error);
}

export async function createBudget(input: BudgetCreateInput): Promise<Budget> {
  const { categories, ...rest } = budgetCreateSchema.parse(input);
  const payload = rest as InsertRow<'budgets'>;
  const budget = unwrap(await supabase.from('budgets').insert(payload).select().single()) as Budget;
  await linkCategories(budget.id, categories);
  return budget;
}

export async function updateBudget(id: string, patch: BudgetUpdateInput): Promise<Budget> {
  const { categories, ...rest } = budgetUpdateSchema.parse(patch);
  const payload = rest as UpdateRow<'budgets'>;
  const budget = unwrap(
    await supabase.from('budgets').update(payload).eq('id', id).select().single(),
  ) as Budget;

  if (categories) {
    // Replace the full set — simplest correct approach for what's normally a handful of rows.
    const { error: deleteError } = await supabase
      .from('budget_categories')
      .delete()
      .eq('budget_id', id);
    if (deleteError) throw new SupabaseError(deleteError);
    await linkCategories(id, categories);
  }

  return budget;
}

/** Hard delete — a budget is a standing rule, not historical data; its `budget_categories` links cascade with it. */
export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw new SupabaseError(error);
}
