import { useAccounts } from '@repo/core/hooks';
import { PageHeader, Screen, Button, ErrorCard } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { BudgetBasicsFields } from '../../../../../../features/budgets/budget-basics-fields';
import { useBudgetDraft } from '../../../../../../features/budgets/budget-draft-context';

/** Step 1: name, amount (locked once you move on to step 2), and the
 * period's size/anchor/repetition. */
export default function NewBudgetBasics() {
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const { draft, setDraft } = useBudgetDraft();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const currency = accounts?.[0]?.currency ?? 'MXN';

  const goToCategories = () => {
    setFieldError(null);
    if (!draft.name.trim()) return setFieldError('Ponle un nombre');
    const amount = Number(draft.amountText.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return setFieldError('El monto debe ser mayor a 0');
    if (draft.periodType === 'custom' && (!draft.customFrom || !draft.customTo)) {
      return setFieldError('Elige el rango de fechas');
    }
    router.push('/(app)/settings/budgets/new/categories');
  };

  return (
    <Screen className="gap-4">
      <PageHeader title="Nuevo presupuesto" onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        <BudgetBasicsFields
          name={draft.name}
          onChangeName={(v) => {
            setDraft((d) => ({ ...d, name: v }));
            setFieldError(null);
          }}
          amountText={draft.amountText}
          onChangeAmount={(v) => {
            setDraft((d) => ({ ...d, amountText: v }));
            setFieldError(null);
          }}
          currency={currency}
          periodType={draft.periodType}
          onChangePeriodType={(v) => {
            setDraft((d) => ({ ...d, periodType: v }));
            setFieldError(null);
          }}
          startDate={draft.startDate}
          onChangeStartDate={(v) => setDraft((d) => ({ ...d, startDate: v }))}
          customFrom={draft.customFrom}
          customTo={draft.customTo}
          onChangeCustomRange={(from, to) => {
            setDraft((d) => ({ ...d, customFrom: from, customTo: to }));
            setFieldError(null);
          }}
          repeats={draft.repeats}
          onChangeRepeats={(v) => setDraft((d) => ({ ...d, repeats: v }))}
        />

        <ErrorCard message={fieldError} />

        <Button label="Siguiente" onPress={goToCategories} />
      </ScrollView>
    </Screen>
  );
}
