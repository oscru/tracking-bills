import { Ionicons } from '@expo/vector-icons';
import type { PeriodInsights } from '@repo/core/utils';
import { formatCurrency } from '@repo/core/utils';
import { ScrollView, Text, useColorScheme, View } from 'react-native';

interface Props {
  insights: PeriodInsights;
  currency: string;
  /** Which metric `insights` was computed for — flips whether "up" reads as good (income) or bad (expense). */
  metric?: 'expense' | 'income';
}

function Chip({
  icon,
  iconColor,
  value,
  valueColor,
  label,
  sublabel,
  muted,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  valueColor: string;
  label: string;
  sublabel?: string;
  muted?: boolean;
}) {
  return (
    <View
      className="min-w-[136px] gap-1.5 rounded-2xl bg-surface p-3.5 dark:bg-surface-dark"
      style={muted ? { opacity: 0.55 } : undefined}
    >
      <Ionicons name={icon} size={16} color={iconColor} />
      <Text className="text-[15px] font-bold" style={{ color: valueColor }}>
        {value}
      </Text>
      <Text className="text-[11px] text-ink-2 dark:text-ink-2-dark">{label}</Text>
      {sublabel ? (
        <Text className="text-[11px] text-ink-3 dark:text-ink-3-dark">{sublabel}</Text>
      ) : null}
    </View>
  );
}

/** Four at-a-glance stat chips computed from `periodInsights` — the tab's
 * "so what" layer on top of the calendar/trend visuals. */
export function InsightsStrip({ insights, currency, metric = 'expense' }: Props) {
  const dark = useColorScheme() === 'dark';
  const posColor = dark ? '#22C55E' : '#16A34A';
  const dangerColor = dark ? '#F16A6E' : '#E5484D';
  const warningColor = dark ? '#F3B25E' : '#B45309';
  const neutralColor = dark ? '#F2F3F5' : '#1A1D21';
  const mutedColor = dark ? '#6B7178' : '#9CA3AF';

  const {
    pctChangeVsPrevious,
    savingsRatePct,
    projectedAmount,
    currentAmount,
    isCurrentPeriod,
    noSpendStreakDays,
    bestNoSpendStreakDays,
  } = insights;

  // More expense is bad (red), more income is good (green) — same up/down
  // arrow, opposite color depending on which metric is being viewed.
  const changeUp = (pctChangeVsPrevious ?? 0) >= 0;
  const changeIsGood = metric === 'income' ? changeUp : !changeUp;
  const changeColor = pctChangeVsPrevious == null ? mutedColor : changeIsGood ? posColor : dangerColor;
  const changeValue =
    pctChangeVsPrevious == null ? '—' : `${changeUp ? '+' : ''}${Math.round(pctChangeVsPrevious)}%`;

  const savingsColor =
    savingsRatePct == null ? mutedColor : savingsRatePct >= 0 ? posColor : dangerColor;
  const savingsValue = savingsRatePct == null ? '—' : `${Math.round(savingsRatePct)}%`;

  const projectionValue = isCurrentPeriod
    ? formatCurrency(projectedAmount ?? 0, currency)
    : formatCurrency(currentAmount, currency);
  const totalLabel = metric === 'income' ? 'recibido en total' : 'gastado en total';
  const projectionLabel = isCurrentPeriod ? 'proyectado a fin de periodo' : totalLabel;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2.5"
    >
      <Chip
        icon={changeUp ? 'trending-up-outline' : 'trending-down-outline'}
        iconColor={changeColor}
        value={changeValue}
        valueColor={changeColor}
        label="vs. periodo anterior"
      />
      <Chip
        icon="checkmark-circle-outline"
        iconColor={savingsColor}
        value={savingsValue}
        valueColor={savingsColor}
        label="tasa de ahorro"
      />
      <Chip
        icon="analytics-outline"
        iconColor={neutralColor}
        value={projectionValue}
        valueColor={neutralColor}
        label={projectionLabel}
      />
      <Chip
        icon="flame-outline"
        iconColor={warningColor}
        value={`${noSpendStreakDays} día${noSpendStreakDays === 1 ? '' : 's'} sin gastar`}
        valueColor={warningColor}
        label={`Mejor racha: ${bestNoSpendStreakDays} día${bestNoSpendStreakDays === 1 ? '' : 's'}`}
        muted={noSpendStreakDays === 0}
      />
    </ScrollView>
  );
}
