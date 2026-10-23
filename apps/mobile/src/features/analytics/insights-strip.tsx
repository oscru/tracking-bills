import type { PeriodInsights } from '@repo/core/utils';
import { formatCurrency } from '@repo/core/utils';
import {
  ChartNoAxesColumn,
  CircleCheck,
  Flame,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { ICON_COLORS, useIsDesktop } from '@repo/ui';

interface Props {
  insights: PeriodInsights;
  currency: string;
  /** Which metric `insights` was computed for — flips whether "up" reads as good (income) or bad (expense). */
  metric?: 'expense' | 'income';
}

function Chip({
  icon: Icon,
  iconColor,
  value,
  valueColor,
  label,
  sublabel,
  muted,
}: {
  icon: LucideIcon;
  iconColor: string;
  value: string;
  valueColor: string;
  label: string;
  sublabel?: string;
  muted?: boolean;
}) {
  const grid = useIsDesktop();
  return (
    <View
      className="min-w-[136px] gap-1.5 rounded-2xl bg-surface p-3.5 dark:bg-surface-dark"
      // Desktop: two per row of the 2×2 grid (see below).
      style={[grid ? { flexBasis: '45%', flexGrow: 1 } : null, muted ? { opacity: 0.55 } : null]}
    >
      <Icon size={16} color={iconColor} />
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
  const { t } = useTranslation('analytics');
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const posColor = dark ? ICON_COLORS.posDark : ICON_COLORS.pos;
  const dangerColor = dark ? ICON_COLORS.dangerDark : ICON_COLORS.danger;
  const warningColor = dark ? ICON_COLORS.warningDark : ICON_COLORS.warning;
  const neutralColor = dark ? ICON_COLORS.inkDark : ICON_COLORS.ink;
  const mutedColor = dark ? ICON_COLORS.ink3Dark : ICON_COLORS.ink3;

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
  const changeColor =
    pctChangeVsPrevious == null ? mutedColor : changeIsGood ? posColor : dangerColor;
  const changeValue =
    pctChangeVsPrevious == null ? '—' : `${changeUp ? '+' : ''}${Math.round(pctChangeVsPrevious)}%`;

  const savingsColor =
    savingsRatePct == null ? mutedColor : savingsRatePct >= 0 ? posColor : dangerColor;
  const savingsValue = savingsRatePct == null ? '—' : `${Math.round(savingsRatePct)}%`;

  const projectionValue = isCurrentPeriod
    ? formatCurrency(projectedAmount ?? 0, currency)
    : formatCurrency(currentAmount, currency);
  const totalLabel = t(metric === 'income' ? 'insights.totalReceived' : 'insights.totalSpent');
  const projectionLabel = isCurrentPeriod ? t('insights.projected') : totalLabel;

  // Desktop: a 2×2 grid — the column is wide enough to show all four at
  // once, where a horizontal strip would cut the last one off.
  const desktop = useIsDesktop();
  const Container = desktop ? GridContainer : StripContainer;

  return (
    <Container>
      <Chip
        icon={changeUp ? TrendingUp : TrendingDown}
        iconColor={changeColor}
        value={changeValue}
        valueColor={changeColor}
        label={t('insights.vsPrevious')}
      />
      <Chip
        icon={CircleCheck}
        iconColor={savingsColor}
        value={savingsValue}
        valueColor={savingsColor}
        label={t('insights.savingsRate')}
      />
      <Chip
        icon={ChartNoAxesColumn}
        iconColor={neutralColor}
        value={projectionValue}
        valueColor={neutralColor}
        label={projectionLabel}
      />
      <Chip
        icon={Flame}
        iconColor={warningColor}
        value={t('insights.noSpendDays', { count: noSpendStreakDays })}
        valueColor={warningColor}
        label={t('insights.bestStreak', { count: bestNoSpendStreakDays })}
        muted={noSpendStreakDays === 0}
      />
    </Container>
  );
}

function StripContainer({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2.5"
    >
      {children}
    </ScrollView>
  );
}

function GridContainer({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-2.5">{children}</View>;
}
