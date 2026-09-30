import { attachTagsBulk, createAccount, createCategory, createTag, createTransactions } from '../supabase';
import type { TransactionCreateInput } from '../validators';
import { AUTO_ACCOUNT_TYPE, AUTO_CATEGORY_COLOR } from './constants';
import type { EntityRef, ImportPlan } from './plan';

export interface ImportRunResult {
  accountsCreated: number;
  categoriesCreated: number;
  tagsCreated: number;
  transactionsCreated: number;
}

function resolveId(ref: EntityRef, created: Map<string, string>): string {
  if ('existingId' in ref) return ref.existingId;
  const id = created.get(ref.newKey);
  if (!id) throw new Error(`Unresolved entity reference: ${ref.newKey}`);
  return id;
}

/**
 * Executes a plan built by `buildImportPlan`: creates whatever
 * accounts/categories/subcategories/tags don't already exist, then
 * bulk-inserts every movement/transfer and links their tags. Order matters —
 * subcategories need their (possibly also new) parent to exist first, and
 * tag links need real transaction ids, which only exist after the insert.
 *
 * Not wrapped in a single DB transaction: if the transaction insert fails,
 * any catalog rows already created stay created. That's fine here — re-running
 * the same plan afterward matches them by name instead of duplicating them.
 */
export async function runImportPlan(
  plan: ImportPlan,
  { defaultCurrency }: { defaultCurrency: string },
): Promise<ImportRunResult> {
  const accountIdByKey = new Map<string, string>();
  for (const a of plan.newAccounts) {
    const created = await createAccount({
      name: a.name,
      type: AUTO_ACCOUNT_TYPE,
      currency: defaultCurrency,
      initial_balance: 0,
      show_on_home: true,
      include_in_total: true,
    });
    accountIdByKey.set(a.key, created.id);
  }

  // Shared by both top-level categories and subcategories — their key
  // namespaces don't collide (subcategory keys are prefixed `sub:`).
  const categoryIdByKey = new Map<string, string>();
  for (const c of plan.newCategories) {
    const created = await createCategory({ name: c.name, type: c.type, color: AUTO_CATEGORY_COLOR });
    categoryIdByKey.set(c.key, created.id);
  }
  for (const s of plan.newSubcategories) {
    const parentId = resolveId(s.parentRef, categoryIdByKey);
    const created = await createCategory({
      name: s.name,
      type: s.type,
      color: AUTO_CATEGORY_COLOR,
      parent_id: parentId,
    });
    categoryIdByKey.set(s.key, created.id);
  }

  const tagIdByKey = new Map<string, string>();
  for (const t of plan.newTags) {
    const created = await createTag({ name: t.name });
    tagIdByKey.set(t.key, created.id);
  }

  const inputs: TransactionCreateInput[] = [];
  const tagRefsByRow: EntityRef[][] = [];

  for (const m of plan.movements) {
    inputs.push({
      type: m.type,
      account_id: resolveId(m.accountRef, accountIdByKey),
      category_id: resolveId(m.transactionCategoryRef, categoryIdByKey),
      amount: m.amount,
      description: m.description,
      transaction_date: m.date,
      is_completed: m.isCompleted,
    });
    tagRefsByRow.push(m.tagRefs);
  }
  for (const t of plan.transfers) {
    inputs.push({
      type: 'transfer',
      account_id: resolveId(t.fromAccountRef, accountIdByKey),
      to_account_id: resolveId(t.toAccountRef, accountIdByKey),
      amount: t.amount,
      description: null,
      transaction_date: t.date,
      is_completed: true,
    });
    tagRefsByRow.push(t.tagRefs);
  }

  const createdTransactions = await createTransactions(inputs);

  const links: { transaction_id: string; tag_id: string }[] = [];
  createdTransactions.forEach((tx, i) => {
    for (const ref of tagRefsByRow[i] ?? []) {
      links.push({ transaction_id: tx.id, tag_id: resolveId(ref, tagIdByKey) });
    }
  });
  await attachTagsBulk(links);

  return {
    accountsCreated: plan.newAccounts.length,
    categoriesCreated: plan.newCategories.length + plan.newSubcategories.length,
    tagsCreated: plan.newTags.length,
    transactionsCreated: createdTransactions.length,
  };
}
