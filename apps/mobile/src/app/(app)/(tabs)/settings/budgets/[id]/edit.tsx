import { useBudgets, useFormError, useUpdateBudget } from '@repo/core/hooks';
import type { BudgetPeriodType } from '@repo/core/types';
import { budgetUpdateSchema } from '@repo/core/validators';
import { todayISODate } from '@repo/core/utils';
import { Button, ErrorCard, PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text } from 'react-native';

import { BudgetBasicsFields } from '../../../../../../features/budgets/budget-basics-fields';
import {
  BudgetCategoriesEditor,
  type CategoryAllocation,
} from '../../../../../../features/budgets/budget-categories-editor';

export default function EditBudget() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: budgets, isLoading } = useBudgets();
  const update = useUpdateBudget();
  const { error, setError, clearError } = useFormError();

  const budget = (budgets ?? []).find((b) => b.id === id);
  const currency = budget?.currency ?? 'MXN';
  const isCustom = budget?.period_type === 'custom';

  const [name, setName] = useState(budget?.name ?? '');
  const [amountText, setAmountText] = useState(budget ? String(Number(budget.amount)) : '');
  const [periodType, setPeriodType] = useState<BudgetPeriodType>(budget?.period_type ?? 'monthly');
  const [startDate, setStartDate] = useState(!isCustom && budget ? budget.start_date : todayISODate());
  const [customFrom, setCustomFrom] = useState<string | null>(isCustom ? (budget?.start_date ?? null) : null);
  const [customTo, setCustomTo] = useState<string | null>(isCustom ? (budget?.end_date ?? null) : null);
  const [repeats, setRepeats] = useState(budget?.repeats ?? false);
  const [categories, setCategories] = useState<CategoryAllocation[]>(
    budget?.categories.map((c) => ({ categoryId: c.category.id, amount: c.amount })) ?? [],
  );
  const [fieldError, setFieldError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!budget) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Presupuesto no encontrado.</Text>
      </Screen>
    );
  }

  const totalAmount = Number(amountText.replace(',', '.')) || 0;

  const dirty = () => {
    setFieldError(null);
    clearError();
  };

  const submit = () => {
    clearError();
    setFieldError(null);
    const amount = Number(amountText.replace(',', '.'));
    if (periodType === 'custom' && (!customFrom || !customTo)) {
      setFieldError('Elige el rango de fechas');
      return;
    }
    const categoryPayload = categories.map((c) => ({ category_id: c.categoryId, amount: c.amount }));
    const payload =
      periodType === 'custom'
        ? {
            name: name.trim(),
            amount,
            categories: categoryPayload,
            period_type: 'custom' as const,
            start_date: customFrom ?? '',
            end_date: customTo ?? '',
            repeats: false,
          }
        : {
            name: name.trim(),
            amount,
            categories: categoryPayload,
            period_type: periodType,
            start_date: startDate,
            repeats,
            end_date: null,
          };

    const parsed = budgetUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Revisa los datos');
      return;
    }
    update.mutate(
      { id: budget.id, patch: parsed.data },
      {
        onSuccess: () => router.back(),
        onError: (e) => setError(e, 'No se pudieron guardar los cambios'),
      },
    );
  };

  return (
    <Screen className="gap-4">
      <PageHeader title="Editar presupuesto" onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        <BudgetBasicsFields
          name={name}
          onChangeName={(v) => {
            setName(v);
            dirty();
          }}
          amountText={amountText}
          onChangeAmount={(v) => {
            setAmountText(v);
            dirty();
          }}
          currency={currency}
          periodType={periodType}
          onChangePeriodType={(v) => {
            setPeriodType(v);
            dirty();
          }}
          startDate={startDate}
          onChangeStartDate={(v) => {
            setStartDate(v);
            dirty();
          }}
          customFrom={customFrom}
          customTo={customTo}
          onChangeCustomRange={(from, to) => {
            setCustomFrom(from);
            setCustomTo(to);
            dirty();
          }}
          repeats={repeats}
          onChangeRepeats={(v) => {
            setRepeats(v);
            dirty();
          }}
        />

        <BudgetCategoriesEditor
          categories={categories}
          onChange={(next) => {
            setCategories(next);
            dirty();
          }}
          totalAmount={totalAmount}
          currency={currency}
        />

        <ErrorCard message={fieldError ?? error} />

        <Button
          label="Guardar cambios"
          onPress={submit}
          loading={update.isPending}
          disabled={categories.length === 0}
        />
      </ScrollView>
    </Screen>
  );
}
