import type { TransactionType } from '@repo/core/types';
import { useSyncExternalStore } from 'react';

export interface TransactionDraftSnapshot {
  view: 'amount' | 'details';
  type: TransactionType;
  /** Raw calculator expression, not yet evaluated (e.g. "150+20"). */
  amount: string;
  accountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  description: string;
  date: string;
  isCompleted: boolean;
}

interface DraftTransactionState {
  /** Whether the floating bubble should be shown (the form screen is closed). */
  minimized: boolean;
  snapshot: TransactionDraftSnapshot | null;
}

let state: DraftTransactionState = { minimized: false, snapshot: null };
const listeners = new Set<() => void>();

function setState(next: DraftTransactionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

/** Single in-progress "new transaction" draft, shared between the form screen and the floating bubble. */
export const draftTransactionStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Minimize: stash the current form state and show the bubble. */
  minimize(snapshot: TransactionDraftSnapshot) {
    setState({ minimized: true, snapshot });
  },
  /** The form screen is open again — hide the bubble but keep the snapshot around. */
  restore() {
    if (state.minimized) setState({ ...state, minimized: false });
  },
  /** Discard the draft entirely (submitted, cancelled, or deleted from the bubble). */
  clear() {
    if (state.minimized || state.snapshot) setState({ minimized: false, snapshot: null });
  },
};

export function useDraftTransaction() {
  return useSyncExternalStore(draftTransactionStore.subscribe, draftTransactionStore.getState);
}
