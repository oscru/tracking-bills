import type { Account, Category, Tag } from '../types';
import type { MovementDraft, ParsedWorkbook, RowIssue, TransferDraft } from './types';

/** Points at either an already-existing catalog row, or one that this plan
 * still needs to create — resolved to a real id only once `runImportPlan`
 * actually creates it. */
export type EntityRef = { existingId: string } | { newKey: string };

export interface NewAccountPlan {
  key: string;
  name: string;
}
export interface NewCategoryPlan {
  key: string;
  name: string;
  type: 'income' | 'expense';
}
export interface NewSubcategoryPlan {
  key: string;
  name: string;
  type: 'income' | 'expense';
  parentRef: EntityRef;
  parentName: string;
}
export interface NewTagPlan {
  key: string;
  name: string;
}

export interface ResolvedMovement extends MovementDraft {
  accountRef: EntityRef;
  /** The id this movement's `category_id` should end up pointing at —
   * the subcategory's ref when one was given, otherwise the top-level category's. */
  transactionCategoryRef: EntityRef;
  tagRefs: EntityRef[];
}

export interface ResolvedTransfer extends TransferDraft {
  fromAccountRef: EntityRef;
  toAccountRef: EntityRef;
  tagRefs: EntityRef[];
}

export interface ImportPlan {
  newAccounts: NewAccountPlan[];
  newCategories: NewCategoryPlan[];
  newSubcategories: NewSubcategoryPlan[];
  newTags: NewTagPlan[];
  movements: ResolvedMovement[];
  transfers: ResolvedTransfer[];
  issues: RowIssue[];
  summary: {
    transactionsToCreate: number;
    accountsToCreate: number;
    categoriesToCreate: number;
    tagsToCreate: number;
    rowErrors: number;
    rowWarnings: number;
  };
}

export interface ImportCatalogs {
  accounts: Account[];
  categories: Category[];
  tags: Tag[];
}

const keyName = (name: string) => name.trim().toLowerCase();
const refKey = (ref: EntityRef) => ('existingId' in ref ? `existing:${ref.existingId}` : `new:${ref.newKey}`);

class CatalogResolver {
  private accountIndex = new Map<string, Account>();
  private topCategoryIndex = new Map<string, Category>();
  private subCategoryIndex = new Map<string, Category>();
  private tagIndex = new Map<string, Tag>();

  newAccounts = new Map<string, NewAccountPlan>();
  newCategories = new Map<string, NewCategoryPlan>();
  newSubcategories = new Map<string, NewSubcategoryPlan>();
  newTags = new Map<string, NewTagPlan>();

  constructor(catalogs: ImportCatalogs) {
    for (const a of catalogs.accounts) {
      const k = keyName(a.name);
      if (!this.accountIndex.has(k)) this.accountIndex.set(k, a);
    }
    for (const c of catalogs.categories) {
      if (c.parent_id == null) {
        const k = `${c.type}:${keyName(c.name)}`;
        if (!this.topCategoryIndex.has(k)) this.topCategoryIndex.set(k, c);
      } else {
        const k = `${c.type}:${c.parent_id}:${keyName(c.name)}`;
        if (!this.subCategoryIndex.has(k)) this.subCategoryIndex.set(k, c);
      }
    }
    for (const t of catalogs.tags) {
      const k = keyName(t.name);
      if (!this.tagIndex.has(k)) this.tagIndex.set(k, t);
    }
  }

  account(name: string): EntityRef {
    const k = keyName(name);
    const existing = this.accountIndex.get(k);
    if (existing) return { existingId: existing.id };
    if (!this.newAccounts.has(k)) this.newAccounts.set(k, { key: k, name: name.trim() });
    return { newKey: k };
  }

  topCategory(name: string, type: 'income' | 'expense'): EntityRef {
    const k = `${type}:${keyName(name)}`;
    const existing = this.topCategoryIndex.get(k);
    if (existing) return { existingId: existing.id };
    if (!this.newCategories.has(k)) this.newCategories.set(k, { key: k, name: name.trim(), type });
    return { newKey: k };
  }

  subCategory(name: string, type: 'income' | 'expense', parentName: string, parentRef: EntityRef): EntityRef {
    // An existing subcategory can only match when its parent already exists
    // for real — a brand-new parent can't have pre-existing children.
    if ('existingId' in parentRef) {
      const existingKey = `${type}:${parentRef.existingId}:${keyName(name)}`;
      const existing = this.subCategoryIndex.get(existingKey);
      if (existing) return { existingId: existing.id };
    }
    const k = `sub:${type}:${refKey(parentRef)}:${keyName(name)}`;
    if (!this.newSubcategories.has(k)) {
      this.newSubcategories.set(k, { key: k, name: name.trim(), type, parentRef, parentName });
    }
    return { newKey: k };
  }

  tag(name: string): EntityRef {
    const k = keyName(name);
    const existing = this.tagIndex.get(k);
    if (existing) return { existingId: existing.id };
    if (!this.newTags.has(k)) this.newTags.set(k, { key: k, name: name.trim() });
    return { newKey: k };
  }
}

/**
 * Resolves every parsed row against the user's current catalogs — matching
 * accounts/categories/subcategories/tags by name (case-insensitive), and
 * queuing a creation for whichever ones don't exist yet. Pure and
 * synchronous: nothing is written until `runImportPlan` executes the result.
 */
export function buildImportPlan(parsed: ParsedWorkbook, catalogs: ImportCatalogs): ImportPlan {
  const resolver = new CatalogResolver(catalogs);

  const movements: ResolvedMovement[] = parsed.movements.map((m) => {
    const accountRef = resolver.account(m.accountName);
    const categoryRef = resolver.topCategory(m.categoryName, m.type);
    const transactionCategoryRef = m.subcategoryName
      ? resolver.subCategory(m.subcategoryName, m.type, m.categoryName, categoryRef)
      : categoryRef;
    const tagRefs = m.tagNames.map((t) => resolver.tag(t));
    return { ...m, accountRef, transactionCategoryRef, tagRefs };
  });

  const transfers: ResolvedTransfer[] = parsed.transfers.map((t) => ({
    ...t,
    fromAccountRef: resolver.account(t.fromAccountName),
    toAccountRef: resolver.account(t.toAccountName),
    tagRefs: t.tagNames.map((n) => resolver.tag(n)),
  }));

  const newAccounts = [...resolver.newAccounts.values()];
  const newCategories = [...resolver.newCategories.values()];
  const newSubcategories = [...resolver.newSubcategories.values()];
  const newTags = [...resolver.newTags.values()];

  return {
    newAccounts,
    newCategories,
    newSubcategories,
    newTags,
    movements,
    transfers,
    issues: parsed.issues,
    summary: {
      transactionsToCreate: movements.length + transfers.length,
      accountsToCreate: newAccounts.length,
      categoriesToCreate: newCategories.length + newSubcategories.length,
      tagsToCreate: newTags.length,
      rowErrors: parsed.issues.filter((i) => i.level === 'error').length,
      rowWarnings: parsed.issues.filter((i) => i.level === 'warning').length,
    },
  };
}
