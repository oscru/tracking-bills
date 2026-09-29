import { useAccounts, useCreateBudget, useFormError } from '@repo/core/hooks';
import { budgetCreateSchema } from '@repo/core/validators';
import { formatCurrency } from '@repo/core/utils';
import { Button, ErrorCard, PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BudgetCategoriesEditor } from '../../../../../../features/budgets/budget-categories-editor';
import { useBudgetDraft } from '../../../../../../features/budgets/budget-draft-context';

/** Step 2: split the step-1 total across one or more categories. The total
 * itself is locked here — going back to step 1 is the only way to change it. */
export default function NewBudgetCategories() {
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const { draft, setDraft } = useBudgetDraft();
  const create = useCreateBudget();
  const { error, setError, clearError } = useFormError();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const currency = accounts?.[0]?.currency ?? 'MXN';

  const totalAmount = Number(draft.amountText.replace(',', '.')) || 0;

  const submit = () => {
    clearError();
    setFieldError(null);
    const categories = draft.categories.map((c) => ({ category_id: c.categoryId, amount: c.amount }));
    const payload =
      draft.periodType === 'custom'
        ? {
            name: draft.name.trim(),
            amount: totalAmount,
            categories,
            period_type: 'custom' as const,
            start_date: draft.customFrom ?? '',
            end_date: draft.customTo ?? '',
          }
        : {
            name: draft.name.trim(),
            amount: totalAmount,
            categories,
            period_type: draft.periodType,
            start_date: draft.startDate,
            repeats: draft.repeats,
          };

    const parsed = budgetCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Revisa los datos');
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: () => router.replace('/(app)/settings/budgets'),
      onError: (e) => setError(e, 'No se pudo guardar el presupuesto'),
    });
  };

  return (
    <Screen className="gap-4">
      <PageHeader title="Elige sus categorías" onBack={() => router.back()} />

      <View className="gap-1 rounded-2xl bg-lime-tint px-4 py-3 dark:bg-lime-tint-dark">
        <Text className="text-xs font-semibold text-lime-ink dark:text-lime-ink-dark" numberOfLines={1}>
          {draft.name || 'Presupuesto'}
        </Text>
        <Text className="text-lg font-bold text-ink dark:text-ink-dark">
          {formatCurrency(totalAmount, currency)}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-8">
        <BudgetCategoriesEditor
          categories={draft.categories}
          onChange={(categories) => setDraft((d) => ({ ...d, categories }))}
          totalAmount={totalAmount}
          currency={currency}
        />

        <ErrorCard message={fieldError ?? error} />

        <Button
          label="Crear presupuesto"
          onPress={submit}
          loading={create.isPending}
          disabled={draft.categories.length === 0}
        />
      </ScrollView>
    </Screen>
  );
}
