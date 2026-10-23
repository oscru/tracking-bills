import type { BudgetPeriodType } from '@repo/core/types';
import { Chip, CurrencyField, SwitchRow, TextField, ICON_COLORS } from '@repo/ui';
import { Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { DateField } from '../transactions/date-field';
import { DateRangeField } from '../transactions/date-range-field';

const PERIOD_OPTIONS: { value: BudgetPeriodType; label: string }[] = [
  { value: 'weekly', label: 'weekly' },
  { value: 'biweekly', label: 'biweekly' },
  { value: 'monthly', label: 'monthly' },
  { value: 'custom', label: 'custom' },
];

interface Props {
  name: string;
  onChangeName: (v: string) => void;
  amountText: string;
  onChangeAmount: (v: string) => void;
  currency: string;
  /** Present only while the currency is still pickable (creation) — omit to show it locked, since an existing budget can't change currency. */
  currencyOptions?: string[];
  onChangeCurrency?: (v: string) => void;
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
  currencyOptions,
  onChangeCurrency,
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
  const { t } = useTranslation('budgets');
  return (
    <View className="gap-5">
      <TextField
        label={t('basics.name')}
        value={name}
        onChangeText={onChangeName}
        placeholder={t('basics.namePlaceholder')}
        maxLength={60}
      />

      <View className="gap-2">
        <CurrencyField
          label={t('basics.amount')}
          value={amountText}
          onChangeText={onChangeAmount}
          currency={currency}
        />
        {onChangeCurrency ? (
          <View className="flex-row flex-wrap gap-2">
            {(currencyOptions ?? [currency]).map((c) => (
              <Chip
                key={c}
                label={c}
                selected={currency === c}
                onPress={() => onChangeCurrency(c)}
              />
            ))}
          </View>
        ) : (
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {t('basics.currencyLocked', { currency })}
          </Text>
        )}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
          {t('basics.period')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={t(`period.${opt.value}`)}
              selected={periodType === opt.value}
              onPress={() => onChangePeriodType(opt.value)}
            />
          ))}
        </View>
      </View>

      {periodType === 'custom' ? (
        <View className="gap-2">
          <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
            {t('basics.dates')}
          </Text>
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
                <Calendar size={16} color={active ? ICON_COLORS.limeInk : ICON_COLORS.ink3} />
                <Text
                  className={
                    active
                      ? 'text-base text-ink dark:text-ink-dark'
                      : 'text-base text-ink-3 dark:text-ink-3-dark'
                  }
                >
                  {active ? label : t('pickRange')}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : (
        <>
          <View className="gap-2">
            <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
              {t('basics.starts')}
            </Text>
            <DateField value={startDate} onChange={onChangeStartDate} />
          </View>

          <SwitchRow
            label={t('basics.repeat')}
            description={t(`basics.repeatHint.${periodType}`)}
            value={repeats}
            onValueChange={onChangeRepeats}
          />
        </>
      )}
    </View>
  );
}
