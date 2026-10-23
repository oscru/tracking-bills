import { Ionicons } from '@expo/vector-icons';
import { useAccounts } from '@repo/core/hooks';
import {
  addDaysISO,
  formatCurrency,
  suggestedGoalContribution,
  todayISODate,
} from '@repo/core/utils';
import { goalCreateSchema, type GoalCreateInput } from '@repo/core/validators';
import {
  Button,
  Chip,
  CurrencyField,
  ErrorCard,
  SwitchRow,
  TextField,
  ICON_COLORS,
} from '@repo/ui';
import { Plus } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AccountPicker } from '../accounts/account-picker';
import { IconPicker } from '../favorites/icon-picker';
import { DateField } from '../transactions/date-field';

export interface GoalFormInitial {
  name?: string;
  icon?: string | null;
  target_amount?: number;
  deadline?: string | null;
  contribution_amount?: number | null;
  contribution_interval_days?: number | null;
  account_id?: string | null;
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
  /** Accounts already linked to some *other* goal (`goals.account_id` is unique)
   * — hidden from the savings-account picker so the user can't even attempt
   * a link the DB would reject. */
  accountsLinkedElsewhere?: string[];
}

type PacePeriod = 'weekly' | 'biweekly' | 'monthly' | 'custom';

const PACE_OPTIONS: { value: PacePeriod; days: number | null }[] = [
  { value: 'weekly', days: 7 },
  { value: 'biweekly', days: 15 },
  { value: 'monthly', days: 30 },
  { value: 'custom', days: null },
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
  accountsLinkedElsewhere,
}: Props) {
  const { t } = useTranslation(['goals', 'favorites', 'transactions']);
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
    initial?.contribution_interval_days != null &&
      paceFromDays(initial.contribution_interval_days) === 'custom'
      ? String(initial.contribution_interval_days)
      : '',
  );
  const [contributionAmountText, setContributionAmountText] = useState(
    initial?.contribution_amount != null ? String(initial.contribution_amount) : '',
  );
  const [hasLinkedAccount, setHasLinkedAccount] = useState(initial?.account_id != null);
  const [accountId, setAccountId] = useState<string | null>(initial?.account_id ?? null);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const { data: accounts } = useAccounts();
  const selectedAccount = (accounts ?? []).find((a) => a.id === accountId) ?? null;

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
    if (!icon) return setFieldError('favorites:form.iconRequired');
    if (hasLinkedAccount && !accountId) return setFieldError(t('form.savingsRequired'));

    const payload = {
      name: name.trim(),
      icon,
      target_amount: targetAmount,
      currency,
      deadline,
      contribution_amount: hasPace ? contributionAmount : null,
      contribution_interval_days: hasPace ? intervalDays : null,
      account_id: hasLinkedAccount ? accountId : null,
    };

    const parsed = goalCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'transactions:form.checkData');
      return;
    }
    onSubmit(parsed.data);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-5 pb-8"
      keyboardShouldPersistTaps="handled"
    >
      <View className="items-center gap-2">
        <Pressable
          onPress={() => setIconPickerOpen(true)}
          className="h-16 w-16 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark"
        >
          <Ionicons
            name={(icon as keyof typeof Ionicons.glyphMap) ?? 'flag-outline'}
            size={26}
            color={ICON_COLORS.limeInk}
          />
        </Pressable>
        <Pressable onPress={() => setIconPickerOpen(true)} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            {t(icon ? 'favorites:form.changeIcon' : 'favorites:form.pickIcon')}
          </Text>
        </Pressable>
      </View>

      <TextField
        label={t('form.name')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          dirty();
        }}
        placeholder={t('form.namePlaceholder')}
        maxLength={60}
      />

      <View className="gap-2">
        <CurrencyField
          label={t('form.target')}
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
                  setAccountId(null);
                  dirty();
                }}
              />
            ))}
          </View>
        ) : (
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {t('form.currencyLocked', { currency })}
          </Text>
        )}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
          {t('form.deadline')}
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
                {t('form.removeDeadline')}
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
            <Plus size={18} color={ICON_COLORS.limeInk} />
            <Text className="text-[14px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              {t('form.addDeadline')}
            </Text>
          </Pressable>
        )}
      </View>

      <SwitchRow
        label={t('form.pace')}
        description={t('form.paceHint')}
        value={hasPace}
        onValueChange={(v) => {
          setHasPace(v);
          dirty();
        }}
      />

      {hasPace ? (
        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
              {t('form.repeats')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PACE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={t(`form.paceOptions.${opt.value}`)}
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
              label={t('form.everyDays')}
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
              label={t('transactions:form.amount')}
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
                  {t('form.useSuggested', { amount: formatCurrency(suggestion, currency) })}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {showShortfallWarning ? (
            <View className="rounded-xl bg-warning-tint p-3.5 dark:bg-warning-tint-dark">
              <Text className="text-xs leading-[17px] text-warning dark:text-warning-dark">
                {t('form.shortfall', {
                  amount: formatCurrency(suggestion ?? 0, currency),
                  interval:
                    intervalDays === 7
                      ? t('form.intervalWeek')
                      : intervalDays === 15
                        ? t('form.intervalBiweek')
                        : t('form.intervalDays', { count: intervalDays ?? 0 }),
                })}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <SwitchRow
        label={t('form.linkAccount')}
        description={t('form.linkAccountHint')}
        value={hasLinkedAccount}
        onValueChange={(v) => {
          setHasLinkedAccount(v);
          if (!v) setAccountId(null);
          dirty();
        }}
      />

      {hasLinkedAccount ? (
        <View className="gap-2">
          <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
            {t('form.savingsAccount')}
          </Text>
          <Pressable
            onPress={() => setAccountPickerOpen(true)}
            className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
          >
            <Text
              className={
                selectedAccount
                  ? 'text-base text-ink dark:text-ink-dark'
                  : 'text-base text-ink-3 dark:text-ink-3-dark'
              }
            >
              {selectedAccount ? selectedAccount.name : t('transactions:form.pickAccount')}
            </Text>
          </Pressable>
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {t('form.onlyFree', { currency })}
          </Text>
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

      <AccountPicker
        visible={accountPickerOpen}
        onClose={() => setAccountPickerOpen(false)}
        title={t('form.savingsAccount')}
        selectedId={accountId}
        onSelect={(id) => {
          setAccountId(id);
          dirty();
        }}
        currencyFilter={currency}
        excludeIds={accountsLinkedElsewhere}
      />
    </ScrollView>
  );
}
