import { useProfile } from '@repo/core/hooks';
import { Screen } from '@repo/ui';
import { Stack } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { BudgetDraftProvider } from '../../../../../../features/budgets/budget-draft-context';

/** Wraps both steps of the "nuevo presupuesto" wizard in one shared draft —
 * each step is a real screen (a Stack push), not a conditional render. Waits
 * on the profile so the draft's default currency is seeded once, at creation,
 * instead of patched in later via an effect. */
export default function NewBudgetLayout() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <BudgetDraftProvider initialCurrency={profile.currency}>
      <Stack screenOptions={{ headerShown: false }} />
    </BudgetDraftProvider>
  );
}
