import { Ionicons } from '@expo/vector-icons';
import type { BudgetPeriodType } from '@repo/core/types';
import { Chip, CurrencyField, SwitchRow, TextField } from '@repo/ui';
import { Pressable, Text, View } from 'react-native';

import { DateField } from '../transactions/date-field';
import { DateRangeField } from '../transactions/date-range-field';

const PERIOD_OPTIONS: { value: BudgetPeriodType; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'custom', label: 'Personalizado' },
];

const REPEATS_DESCRIPTION: Record<Exclude<BudgetPeriodType, 'custom'>, string> = {
  weekly: 'Al terminar la semana, se abre una nueva automáticamente',
  biweekly: 'Al terminar la quincena, se abre una nueva automáticamente',
  monthly: 'Al terminar el mes, se abre uno nuevo automáticamente',
};

interface Props {
  name: string;
  onChangeName: (v: string) => void;
  amountText: string;
  onChangeAmount: (v: string) => void;
  currency: string;
  periodType: BudgetPeriodType;
  onChangePeriodType: (v: BudgetPeriodType) => void;
  /** When a weekly/biweekly/monthly budget starts. Not used for 'custom' — that has its own range below. */
  startDate: string;
  onChangeStartDate: (v: string) => void;
  /** 'custom' only — kept fully separate from `startDate` so switching period types never leaves a stale, misleadingly-prefilled range. */
  customFrom: string | null;
  customTo: string | null;
  onChangeCustomRange: (from: string | null, to: string | null) => void;
  repeats: boolean;
  onChangeRepeats: (v: boolean) => void;
}

/** Name, amount, and the period's size/anchor/repetition (with a custom date
 * range when applicable) — shared between the creation wizard's step 1 and
 * the flat edit form. */
export function BudgetBasicsFields({
  name,
  onChangeName,
  amountText,
  onChangeAmount,
  currency,
  periodType,
  onChangePeriodType,
  startDate,
  onChangeStartDate,
  customFrom,
  customTo,
  onChangeCustomRange,
  repeats,
  onChangeRepeats,
}: Props) {
  return (
    <View className="gap-5">
      <TextField
        label="Nombre"
        value={name}
        onChangeText={onChangeName}
        placeholder="Ej. Comida y entretenimiento"
        maxLength={60}
      />

      <CurrencyField label="Monto" value={amountText} onChangeText={onChangeAmount} currency={currency} />

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
          Rango del presupuesto
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={periodType === opt.value}
              onPress={() => onChangePeriodType(opt.value)}
            />
          ))}
        </View>
      </View>

      {periodType === 'custom' ? (
        <View className="gap-2">
          <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Rango de fechas</Text>
          <DateRangeField
            from={customFrom}
            to={customTo}
            onChange={onChangeCustomRange}
            forceRangeMode
            renderTrigger={({ label, active, onPress }) => (
              <Pressable
                onPress={onPress}
                className="h-[52px] flex-row items-center gap-2 rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
              >
                <Ionicons name="calendar-outline" size={16} color={active ? '#4D7C0F' : '#9CA3AF'} />
                <Text
                  className={
                    active
                      ? 'text-base text-ink dark:text-ink-dark'
                      : 'text-base text-ink-3 dark:text-ink-3-dark'
                  }
                >
                  {active ? label : 'Elige el rango de fechas'}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : (
        <>
          <View className="gap-2">
            <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Empieza</Text>
            <DateField value={startDate} onChange={onChangeStartDate} />
          </View>

          <SwitchRow
            label="Repetir automáticamente"
            description={REPEATS_DESCRIPTION[periodType]}
            value={repeats}
            onValueChange={onChangeRepeats}
          />
        </>
      )}
    </View>
  );
}
