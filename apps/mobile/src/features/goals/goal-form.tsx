import { Ionicons } from '@expo/vector-icons';
import { addDaysISO, formatCurrency, suggestedGoalContribution, todayISODate } from '@repo/core/utils';
import { goalCreateSchema, type GoalCreateInput } from '@repo/core/validators';
import { Button, Chip, CurrencyField, ErrorCard, SwitchRow, TextField } from '@repo/ui';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { IconPicker } from '../favorites/icon-picker';
import { DateField } from '../transactions/date-field';

export interface GoalFormInitial {
  name?: string;
  icon?: string | null;
  target_amount?: number;
  deadline?: string | null;
  contribution_amount?: number | null;
  contribution_interval_days?: number | null;
}

interface Props {
  initial?: GoalFormInitial;
  currency: string;
  /** Present only while the currency is still pickable (creation) — omit to show it locked, since an existing goal can't change currency. */
  currencyOptions?: string[];
  onChangeCurrency?: (v: string) => void;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: GoalCreateInput) => void;
  /** Called whenever a field changes — the parent should clear its `error` so it doesn't linger once the user starts fixing it. */
  onDirty?: () => void;
  footer?: ReactNode;
}

type PacePeriod = 'weekly' | 'biweekly' | 'monthly' | 'custom';

const PACE_OPTIONS: { value: PacePeriod; label: string; days: number | null }[] = [
  { value: 'weekly', label: 'Semanal', days: 7 },
  { value: 'biweekly', label: 'Quincenal', days: 15 },
  { value: 'monthly', label: 'Mensual', days: 30 },
  { value: 'custom', label: 'Personalizado', days: null },
];

/** The pace preset (if any) whose fixed day count matches `days` — used to
 * pick a sane starting chip when editing a goal that already has a pace. */
function paceFromDays(days: number | null | undefined): PacePeriod {
  if (days == null) return 'monthly';
  return PACE_OPTIONS.find((o) => o.days === days)?.value ?? 'custom';
}

export function GoalForm({
  initial,
  currency,
  currencyOptions,
  onChangeCurrency,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onDirty,
  footer,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState<string | null>(initial?.icon ?? null);
  const [amountText, setAmountText] = useState(
    initial?.target_amount != null ? String(initial.target_amount) : '',
  );
  const [deadline, setDeadline] = useState<string | null>(initial?.deadline ?? null);
  const [hasPace, setHasPace] = useState(initial?.contribution_amount != null);
  const [pacePeriod, setPacePeriod] = useState<PacePeriod>(
    paceFromDays(initial?.contribution_interval_days),
  );
  const [customDaysText, setCustomDaysText] = useState(
    initial?.contribution_interval_days != null && paceFromDays(initial.contribution_interval_days) === 'custom'
      ? String(initial.contribution_interval_days)
      : '',
  );
  const [contributionAmountText, setContributionAmountText] = useState(
    initial?.contribution_amount != null ? String(initial.contribution_amount) : '',
  );

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const dirty = () => {
    setFieldError(null);
    onDirty?.();
  };

  const intervalDays =
    pacePeriod === 'custom'
      ? Number(customDaysText) || null
      : (PACE_OPTIONS.find((o) => o.value === pacePeriod)?.days ?? null);

  const targetAmount = Number(amountText.replace(',', '.')) || 0;
  const suggestion =
    hasPace && deadline && intervalDays && targetAmount > 0
      ? suggestedGoalContribution(targetAmount, deadline, intervalDays)
      : null;

  const contributionAmount = Number(contributionAmountText.replace(',', '.'));
  const showShortfallWarning =
    suggestion != null &&
    Number.isFinite(contributionAmount) &&
    contributionAmount > 0 &&
    contributionAmount < suggestion;

  const submit = () => {
    setFieldError(null);
    if (!icon) return setFieldError('Elige un ícono');

    const payload = {
      name: name.trim(),
      icon,
      target_amount: targetAmount,
      currency,
      deadline,
      contribution_amount: hasPace ? contributionAmount : null,
      contribution_interval_days: hasPace ? intervalDays : null,
    };

    const parsed = goalCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Revisa los datos');
      return;
    }
    onSubmit(parsed.data);
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-8" keyboardShouldPersistTaps="handled">
      <View className="items-center gap-2">
        <Pressable
          onPress={() => setIconPickerOpen(true)}
          className="h-16 w-16 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark"
        >
          <Ionicons
            name={(icon as keyof typeof Ionicons.glyphMap) ?? 'flag-outline'}
            size={26}
            color="#4D7C0F"
          />
        </Pressable>
        <Pressable onPress={() => setIconPickerOpen(true)} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            {icon ? 'Cambiar ícono' : 'Elegir ícono'}
          </Text>
        </Pressable>
      </View>

      <TextField
        label="Nombre"
        value={name}
        onChangeText={(v) => {
          setName(v);
          dirty();
        }}
        placeholder="Ej. Vacaciones"
        maxLength={60}
      />

      <View className="gap-2">
        <CurrencyField
          label="Monto a alcanzar"
          value={amountText}
          onChangeText={(v) => {
            setAmountText(v);
            dirty();
          }}
          currency={currency}
        />
        {onChangeCurrency ? (
          <View className="flex-row flex-wrap gap-2">
            {(currencyOptions ?? [currency]).map((c) => (
              <Chip
                key={c}
                label={c}
                selected={currency === c}
                onPress={() => {
                  onChangeCurrency(c);
                  dirty();
                }}
              />
            ))}
          </View>
        ) : (
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            Divisa: {currency} — no se puede cambiar después de crear el objetivo.
          </Text>
        )}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
          Fecha límite (opcional)
        </Text>
        {deadline ? (
          <View className="gap-2">
            <DateField
              value={deadline}
              onChange={(v) => {
                setDeadline(v);
                dirty();
              }}
              showQuickChips={false}
            />
            <Pressable
              onPress={() => {
                setDeadline(null);
                dirty();
              }}
              hitSlop={8}
              className="self-start"
            >
              <Text className="text-xs font-semibold text-danger dark:text-danger-dark">
                Quitar fecha límite
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setDeadline(addDaysISO(todayISODate(), 7));
              dirty();
            }}
            className="h-12 flex-row items-center justify-center gap-1.5 rounded-ctl border border-dashed border-line dark:border-line-dark"
          >
            <Ionicons name="add" size={18} color="#4D7C0F" />
            <Text className="text-[14px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              Agregar fecha límite
            </Text>
          </Pressable>
        )}
      </View>

      <SwitchRow
        label="Definir ritmo de ahorro"
        description="Un monto sugerido cada cierto número de días, para ver si vas a tiempo"
        value={hasPace}
        onValueChange={(v) => {
          setHasPace(v);
          dirty();
        }}
      />

      {hasPace ? (
        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Se repite</Text>
            <View className="flex-row flex-wrap gap-2">
              {PACE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={pacePeriod === opt.value}
                  onPress={() => {
                    setPacePeriod(opt.value);
                    dirty();
                  }}
                />
              ))}
            </View>
          </View>

          {pacePeriod === 'custom' ? (
            <TextField
              label="Cada cuántos días"
              value={customDaysText}
              onChangeText={(v) => {
                setCustomDaysText(v.replace(/[^0-9]/g, ''));
                dirty();
              }}
              placeholder="10"
              keyboardType="number-pad"
            />
          ) : null}

          <View className="gap-2">
            <CurrencyField
              label="Monto"
              value={contributionAmountText}
              onChangeText={(v) => {
                setContributionAmountText(v);
                dirty();
              }}
              currency={currency}
            />
            {suggestion != null ? (
              <Pressable
                onPress={() => {
                  setContributionAmountText(suggestion.toFixed(2));
                  dirty();
                }}
                hitSlop={8}
                className="self-start"
              >
                <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
                  Usar sugerido ({formatCurrency(suggestion, currency)})
                </Text>
              </Pressable>
            ) : null}
          </View>

          {showShortfallWarning ? (
            <View className="rounded-xl bg-warning-tint p-3.5 dark:bg-warning-tint-dark">
              <Text className="text-xs leading-[17px] text-warning dark:text-warning-dark">
                Con este monto es probable que no alcances tu objetivo antes de la fecha límite —
                necesitarías {formatCurrency(suggestion ?? 0, currency)} cada{' '}
                {intervalDays === 7
                  ? 'semana'
                  : intervalDays === 15
                    ? 'quincena'
                    : `${intervalDays} días`}
                .
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <ErrorCard message={fieldError ?? error} />

      <Button label={submitLabel} onPress={submit} loading={submitting} />

      {footer}

      <IconPicker
        visible={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        value={icon}
        onSelect={(name) => {
          setIcon(name);
          dirty();
        }}
      />
    </ScrollView>
  );
}
