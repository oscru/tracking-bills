import { Stack } from 'expo-router';

import { BudgetDraftProvider } from '../../../../../../features/budgets/budget-draft-context';

/** Wraps both steps of the "nuevo presupuesto" wizard in one shared draft —
 * each step is a real screen (a Stack push), not a conditional render. */
export default function NewBudgetLayout() {
  return (
    <BudgetDraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </BudgetDraftProvider>
  );
}
