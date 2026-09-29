import type { BudgetPeriodType } from '@repo/core/types';
import { todayISODate } from '@repo/core/utils';
import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import type { CategoryAllocation } from './budget-categories-editor';

export interface BudgetDraft {
  name: string;
  amountText: string;
  periodType: BudgetPeriodType;
  /** Weekly/biweekly/monthly only — 'custom' uses customFrom/customTo instead. */
  startDate: string;
  customFrom: string | null;
  customTo: string | null;
  repeats: boolean;
  categories: CategoryAllocation[];
}

function defaultDraft(): BudgetDraft {
  return {
    name: '',
    amountText: '',
    periodType: 'monthly',
    startDate: todayISODate(),
    customFrom: null,
    customTo: null,
    repeats: false,
    categories: [],
  };
}

interface BudgetDraftContextValue {
  draft: BudgetDraft;
  setDraft: Dispatch<SetStateAction<BudgetDraft>>;
}

const BudgetDraftContext = createContext<BudgetDraftContextValue | null>(null);

/** Holds the in-progress "nuevo presupuesto" wizard state across its two
 * screens (step 1: básicos, step 2: categorías) — scoped to that route
 * subtree so it resets whenever the flow is re-entered. */
export function BudgetDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BudgetDraft>(defaultDraft);
  return <BudgetDraftContext.Provider value={{ draft, setDraft }}>{children}</BudgetDraftContext.Provider>;
}

export function useBudgetDraft(): BudgetDraftContextValue {
  const ctx = useContext(BudgetDraftContext);
  if (!ctx) throw new Error('useBudgetDraft must be used within a BudgetDraftProvider');
  return ctx;
}
