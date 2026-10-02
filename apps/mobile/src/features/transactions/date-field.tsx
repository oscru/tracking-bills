import { Ionicons } from '@expo/vector-icons';
import { addDaysISO, formatDate, todayISODate } from '@repo/core/utils';
import { BottomSheet, Chip, ICON_COLORS } from '@repo/ui';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { capitalize, monthGrid, WEEKDAYS } from './calendar-grid';

interface DateFieldProps {
  value: string;
  onChange: (iso: string) => void;
  /** Hide the Hoy/Ayer/Mañana shortcuts — for dates unlikely to be "today-ish", like a goal's deadline. */
  showQuickChips?: boolean;
  /** Shown instead of a formatted date while `value` is empty — for a field
   * with no sensible default, like a birth date. */
  placeholder?: string;
}

/** How many years back the year-jump list in the calendar sheet offers —
 * past a handful, picking a year by tapping "‹" per month is impractical
 * (e.g. a birth date decades ago). */
const YEARS_BACK = 120;

export function DateField({ value, onChange, showQuickChips = true, placeholder }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'calendar' | 'years'>('calendar');
  const parsed = useMemo(() => {
    const [y, m, d] = value.split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : new Date();
  }, [value]);
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());

  const openPicker = () => {
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());
    setView('calendar');
    setOpen(true);
  };

  const currentYear = todayISODate().split('-').map(Number)[0]!;
  const years = useMemo(
    () => Array.from({ length: YEARS_BACK + 2 }, (_, i) => currentYear + 1 - i),
    [currentYear],
  );

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const today = todayISODate();
  const grid = useMemo(() => monthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthTitle = capitalize(
    new Date(viewYear, viewMonth, 1).toLocaleDateString('es-MX', { month: 'long' }),
  );

  return (
    <View className="gap-2">
      {showQuickChips ? (
        <View className="flex-row gap-2">
          <Chip label="Hoy" selected={value === today} onPress={() => onChange(today)} />
          <Chip
            label="Ayer"
            selected={value === addDaysISO(today, -1)}
            onPress={() => onChange(addDaysISO(today, -1))}
          />
          <Chip
            label="Mañana"
            selected={value === addDaysISO(today, 1)}
            onPress={() => onChange(addDaysISO(today, 1))}
          />
        </View>
      ) : null}

      <Pressable
        onPress={openPicker}
        className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
      >
        <Text
          // `capitalize` (for the month abbreviation in a real formatted date)
          // would also title-case the placeholder — override via inline
          // `style`, not a conditional className: toggling a text-transform
          // class on/off between renders is the same known NativeWind bug
          // that crashes `shadow-*` toggles elsewhere in this codebase.
          style={value ? undefined : { textTransform: 'none' }}
          className={`text-base capitalize ${
            value ? 'text-ink dark:text-ink-dark' : 'text-ink-3 dark:text-ink-3-dark'
          }`}
        >
          {value ? formatDate(value) : (placeholder ?? '')}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={ICON_COLORS.ink3} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={view === 'calendar' ? 'Elegir fecha' : undefined}
      >
        {view === 'years' ? (
          <>
            <View className="flex-row items-center px-5 pb-2 pt-1">
              <Pressable
                onPress={() => setView('calendar')}
                hitSlop={8}
                className="flex-row items-center gap-1 active:opacity-60"
              >
                <Ionicons name="chevron-back" size={18} color={ICON_COLORS.ink3} />
                <Text className="text-[15px] font-semibold text-ink-2 dark:text-ink-2-dark">
                  {monthTitle}
                </Text>
              </Pressable>
            </View>
            <ScrollView className="max-h-[420px]" contentContainerClassName="pb-8">
              {years.map((y) => (
                <Pressable
                  key={y}
                  onPress={() => {
                    setViewYear(y);
                    setView('calendar');
                  }}
                  className="flex-row items-center justify-between border-t border-line px-5 py-3.5 dark:border-line-dark"
                >
                  <Text
                    className={`text-[15px] ${
                      y === viewYear
                        ? 'font-bold text-ink dark:text-ink-dark'
                        : 'text-ink-2 dark:text-ink-2-dark'
                    }`}
                  >
                    {y}
                  </Text>
                  {y === viewYear ? (
                    <Ionicons name="checkmark" size={18} color={ICON_COLORS.limeInk} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : (
          <ScrollView
            className="max-h-[480px]"
            contentContainerClassName="gap-3 px-5 pb-6"
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-row items-center justify-between">
              <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} className="p-1">
                <Ionicons name="chevron-back" size={20} color={ICON_COLORS.ink3} />
              </Pressable>
              <Pressable
                onPress={() => setView('years')}
                hitSlop={8}
                className="flex-row items-center gap-1 rounded-full px-2 py-1 active:opacity-60"
              >
                <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">
                  {monthTitle} {viewYear}
                </Text>
                <Ionicons name="chevron-down" size={14} color={ICON_COLORS.ink3} />
              </Pressable>
              <Pressable onPress={() => shiftMonth(1)} hitSlop={8} className="p-1">
                <Ionicons name="chevron-forward" size={20} color={ICON_COLORS.ink3} />
              </Pressable>
            </View>

            <View className="flex-row">
              {WEEKDAYS.map((w) => (
                <View key={w} className="flex-1 items-center">
                  <Text className="text-xs font-semibold text-ink-3 dark:text-ink-3-dark">{w}</Text>
                </View>
              ))}
            </View>

            {grid.map((row, i) => (
              <View key={i} className="flex-row">
                {row.map((date, j) => {
                  if (!date) {
                    return (
                      <View key={j} className="flex-1 items-center py-1">
                        <View className="h-9 w-9" />
                      </View>
                    );
                  }
                  const iso = todayISODate(date);
                  const selected = iso === value;
                  const isToday = iso === today;
                  return (
                    <View key={j} className="flex-1 items-center py-1">
                      <Pressable
                        onPress={() => {
                          onChange(iso);
                          setOpen(false);
                        }}
                        className={`h-9 w-9 items-center justify-center rounded-full ${
                          selected ? 'bg-lime' : ''
                        }`}
                      >
                        <Text
                          className={`text-[14px] ${
                            selected
                              ? 'font-bold text-ink'
                              : isToday
                                ? 'font-bold text-lime-ink dark:text-lime-ink-dark'
                                : 'text-ink dark:text-ink-dark'
                          }`}
                        >
                          {date.getDate()}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}
      </BottomSheet>
    </View>
  );
}
