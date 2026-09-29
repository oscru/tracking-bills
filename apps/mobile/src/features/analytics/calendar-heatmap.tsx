import { formatCompactAmount } from '@repo/core/utils';
import { Pressable, Text, useColorScheme, View } from 'react-native';

export interface HeatmapCell {
  key: string;
  label: string;
  total: number;
  /** A spacer cell (month-grid padding before day 1) — not pressable, no color. */
  blank?: boolean;
}

export type HeatmapVariant = 'expense' | 'income';

interface Props {
  cells: HeatmapCell[];
  columns: number;
  weekdayHeader?: string[];
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  /** Which palette tints the cells — red for expense, green for income. Defaults to expense. */
  variant?: HeatmapVariant;
  /** Show each cell's total (compact, e.g. "$1.8k") under its label — day number or month abbreviation. */
  showAmounts?: boolean;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Four fixed, solid steps per theme — not a gradient. A continuous
// alpha/lerp ramp reads as "the same color, more or less faded", which is
// hard to tell apart at a glance; distinct steps (like a calendar-heatmap
// legend) make each band recognizable on its own.
const EXPENSE_LIGHT_STEPS: { bg: string; fg: string }[] = [
  { bg: '#FBD5D6', fg: '#1A1D21' },
  { bg: '#F3989C', fg: '#1A1D21' },
  { bg: '#EB6367', fg: '#FFFFFF' },
  { bg: '#E5484D', fg: '#FFFFFF' },
];
const EXPENSE_DARK_STEPS: { bg: string; fg: string }[] = [
  { bg: '#4A2A2D', fg: '#F2F3F5' },
  { bg: '#7A3A3E', fg: '#F2F3F5' },
  { bg: '#B14A50', fg: '#FFFFFF' },
  { bg: '#F16A6E', fg: '#1A1D21' },
];
const INCOME_LIGHT_STEPS: { bg: string; fg: string }[] = [
  { bg: '#D5F0DE', fg: '#1A1D21' },
  { bg: '#98D8B1', fg: '#1A1D21' },
  { bg: '#4FB776', fg: '#FFFFFF' },
  { bg: '#16A34A', fg: '#FFFFFF' },
];
const INCOME_DARK_STEPS: { bg: string; fg: string }[] = [
  { bg: '#22392C', fg: '#F2F3F5' },
  { bg: '#2E5B40', fg: '#F2F3F5' },
  { bg: '#3C9058', fg: '#FFFFFF' },
  { bg: '#22C55E', fg: '#1A1D21' },
];

function bucketColor(bucket: number, dark: boolean, variant: HeatmapVariant): { bg: string; fg: string } {
  const steps =
    variant === 'income'
      ? dark
        ? INCOME_DARK_STEPS
        : INCOME_LIGHT_STEPS
      : dark
        ? EXPENSE_DARK_STEPS
        : EXPENSE_LIGHT_STEPS;
  return steps[Math.min(Math.max(bucket, 1), steps.length) - 1] ?? steps[0]!;
}

function intensity(
  total: number,
  maxTotal: number,
  dark: boolean,
  variant: HeatmapVariant,
): { bg: string; fg: string } {
  if (total <= 0) return { bg: 'transparent', fg: dark ? '#F2F3F5' : '#1A1D21' };
  const ratio = maxTotal > 0 ? Math.min(total / maxTotal, 1) : 0;
  const bucket = Math.max(1, Math.ceil(ratio * 4));
  return bucketColor(bucket, dark, variant);
}

/** A day-of-month or month-of-year grid, each cell tinted by its own expense
 * or income total — the tab's "at a glance" view of where money concentrates. */
export function CalendarHeatmap({
  cells,
  columns,
  weekdayHeader,
  selectedKey,
  onSelect,
  variant = 'expense',
  showAmounts = false,
}: Props) {
  const dark = useColorScheme() === 'dark';
  const maxTotal = Math.max(1, ...cells.filter((c) => !c.blank).map((c) => c.total));
  const rows = chunk(cells, columns);

  return (
    <View className="gap-1.5">
      {weekdayHeader ? (
        <View className="flex-row">
          {weekdayHeader.map((d, i) => (
            <Text key={i} className="flex-1 text-center text-[11px] text-ink-3 dark:text-ink-3-dark">
              {d}
            </Text>
          ))}
        </View>
      ) : null}

      {rows.map((row, ri) => (
        <View key={ri} className="flex-row gap-1.5">
          {row.map((cell) => {
            if (cell.blank) {
              return <View key={cell.key} className="flex-1" style={{ aspectRatio: 1 }} />;
            }
            const { bg, fg } = intensity(cell.total, maxTotal, dark, variant);
            const selected = cell.key === selectedKey;
            return (
              <Pressable
                key={cell.key}
                onPress={() => onSelect?.(cell.key)}
                className="flex-1 items-center justify-center rounded-[10px]"
                style={{
                  aspectRatio: 1,
                  backgroundColor: bg,
                  borderWidth: selected ? 2 : 0,
                  borderColor: '#B9F227',
                }}
              >
                <Text className="text-[13px] font-semibold leading-none" style={{ color: fg }}>
                  {cell.label}
                </Text>
                {showAmounts && cell.total > 0 ? (
                  <Text
                    className="mt-0.5 text-[8px] font-medium leading-none"
                    style={{ color: fg, opacity: 0.85 }}
                    numberOfLines={1}
                  >
                    {formatCompactAmount(cell.total)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
