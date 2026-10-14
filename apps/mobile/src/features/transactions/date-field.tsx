import { addDaysISO, formatDate, getDateFormat, todayISODate } from '@repo/core/utils';
import { BottomSheet, Chip, GradientFill, ICON_COLORS } from '@repo/ui';
import * as Haptics from 'expo-haptics';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInLeft, FadeInRight } from 'react-native-reanimated';

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

/** How many years back the year grid offers — past a handful, paging by
 * month is impractical (e.g. a birth date decades ago). */
const YEARS_BACK = 120;
const YEAR_ROW_HEIGHT = 56;
// A horizontal swipe on the day grid past this pages the month.
const SWIPE_THRESHOLD = 40;

type PickerView = 'calendar' | 'months' | 'years';

/** The month on screen, and which way the last change went (the new grid slides in from that side). */
type Cursor = { year: number; month: number; direction: 1 | -1 };

function selectionHaptic() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

function parseISO(value: string): Date | null {
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

/** "Lunes 12 de octubre" — the sheet's headline for the chosen day. */
function longLabel(date: Date): string {
  return capitalize(
    getDateFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(date),
  );
}

/** A quick-pick pill in the field row: lime when it's the current value. */
function QuickPill({
  label,
  selected,
  onPress,
  icon,
  grow = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: boolean;
  grow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-ctl border px-4 active:opacity-70 ${
        grow ? 'flex-1' : ''
      } ${
        selected
          ? 'border-lime bg-lime'
          : 'border-line bg-surface dark:border-line-dark dark:bg-surface-dark'
      }`}
    >
      {icon ? (
        <CalendarDays size={16} color={selected ? ICON_COLORS.ink : ICON_COLORS.ink3} />
      ) : null}
      <Text
        numberOfLines={1}
        className={`text-[14px] font-semibold ${
          selected ? 'text-ink' : 'text-ink-2 dark:text-ink-2-dark'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function DateField({ value, onChange, showQuickChips = true, placeholder }: DateFieldProps) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PickerView>('calendar');
  const selectedDate = useMemo(() => parseISO(value), [value]);
  const initial = selectedDate ?? new Date();
  const [cursor, setCursor] = useState<Cursor>({
    year: initial.getFullYear(),
    month: initial.getMonth(),
    direction: 1,
  });
  const { year: viewYear, month: viewMonth, direction } = cursor;

  const today = todayISODate();
  const yesterday = addDaysISO(today, -1);
  const tomorrow = addDaysISO(today, 1);
  const [todayYear, todayMonth] = today.split('-').map(Number) as [number, number];

  const openPicker = () => {
    const base = selectedDate ?? new Date();
    setCursor({ year: base.getFullYear(), month: base.getMonth(), direction: 1 });
    setView('calendar');
    setOpen(true);
  };

  const pick = (iso: string) => {
    selectionHaptic();
    onChange(iso);
    setOpen(false);
  };

  // Functional update, so it never closes over a stale month — the swipe
  // gesture below is built once and keeps calling this same function.
  const shiftMonth = useCallback((delta: 1 | -1) => {
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth(), direction: delta };
    });
  }, []);

  const monthNames = useMemo(() => {
    const format = getDateFormat('es-MX', { month: 'long' });
    return Array.from({ length: 12 }, (_, i) => capitalize(format.format(new Date(2000, i, 1))));
  }, []);
  const shortMonthNames = useMemo(() => {
    const format = getDateFormat('es-MX', { month: 'short' });
    return Array.from({ length: 12 }, (_, i) =>
      capitalize(format.format(new Date(2000, i, 1)).replace('.', '')),
    );
  }, []);

  const years = useMemo(
    () => Array.from({ length: YEARS_BACK + 2 }, (_, i) => todayYear + 1 - i),
    [todayYear],
  );
  const yearRows = useMemo(() => {
    const rows: number[][] = [];
    for (let i = 0; i < years.length; i += 3) rows.push(years.slice(i, i + 3));
    return rows;
  }, [years]);
  const yearsScroll = useRef<ScrollView>(null);

  const grid = useMemo(() => monthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // Swipe the day grid sideways to page months. Runs the JS callback only
  // on release — nothing per-frame.
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-15, 15])
        .failOffsetY([-12, 12])
        .onEnd((e) => {
          if (e.translationX <= -SWIPE_THRESHOLD) shiftMonth(1);
          else if (e.translationX >= SWIPE_THRESHOLD) shiftMonth(-1);
        }),
    [shiftMonth],
  );

  const isQuick = value === today || value === yesterday;
  const fieldLabel = value ? formatDate(value) : (placeholder ?? 'Elegir fecha');

  return (
    <>
      {showQuickChips ? (
        <View className="flex-row gap-2">
          <QuickPill label="Hoy" selected={value === today} onPress={() => onChange(today)} />
          <QuickPill
            label="Ayer"
            selected={value === yesterday}
            onPress={() => onChange(yesterday)}
          />
          <QuickPill
            label={value && !isQuick ? formatDate(value) : 'Otra fecha'}
            selected={Boolean(value) && !isQuick}
            onPress={openPicker}
            icon
            grow
          />
        </View>
      ) : (
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          className="h-[52px] flex-row items-center gap-3 rounded-ctl border border-line bg-surface pl-2 pr-3.5 active:opacity-70 dark:border-line-dark dark:bg-surface-dark"
        >
          <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-lime-tint dark:bg-lime-tint-dark">
            <CalendarDays size={18} color={dark ? ICON_COLORS.limeInkDark : ICON_COLORS.limeInk} />
          </View>
          <Text
            numberOfLines={1}
            className={`flex-1 text-base ${
              value ? 'font-medium text-ink dark:text-ink-dark' : 'text-ink-3 dark:text-ink-3-dark'
            }`}
          >
            {fieldLabel}
          </Text>
          <ChevronDown size={18} color={ICON_COLORS.ink3} />
        </Pressable>
      )}

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <View className="gap-4 px-5 pb-6">
          {/* Headline: the chosen day, big — what you're about to change. */}
          <View className="gap-0.5">
            <Text className="text-xs font-semibold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
              {selectedDate ? selectedDate.getFullYear() : 'Fecha'}
            </Text>
            <Text className="text-[24px] font-bold tracking-tight text-ink dark:text-ink-dark">
              {selectedDate ? longLabel(selectedDate) : 'Sin fecha'}
            </Text>
          </View>

          {showQuickChips && view === 'calendar' ? (
            <View className="flex-row gap-2">
              <Chip label="Hoy" selected={value === today} onPress={() => pick(today)} />
              <Chip label="Ayer" selected={value === yesterday} onPress={() => pick(yesterday)} />
              <Chip label="Mañana" selected={value === tomorrow} onPress={() => pick(tomorrow)} />
            </View>
          ) : null}

          {/* Month / year selects on the left, month paging on the right. */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <Pressable
                onPress={() => setView(view === 'months' ? 'calendar' : 'months')}
                hitSlop={6}
                accessibilityLabel="Elegir mes"
                className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 active:opacity-70 ${
                  view === 'months' ? 'bg-ink dark:bg-lime' : 'bg-canvas dark:bg-canvas-dark'
                }`}
              >
                <Text
                  className={`text-[15px] font-bold ${
                    view === 'months' ? 'text-lime dark:text-ink' : 'text-ink dark:text-ink-dark'
                  }`}
                >
                  {monthNames[viewMonth]}
                </Text>
                <ChevronDown
                  size={14}
                  color={
                    view === 'months'
                      ? dark
                        ? ICON_COLORS.ink
                        : ICON_COLORS.lime
                      : ICON_COLORS.ink3
                  }
                />
              </Pressable>
              <Pressable
                onPress={() => setView(view === 'years' ? 'calendar' : 'years')}
                hitSlop={6}
                accessibilityLabel="Elegir año"
                className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 active:opacity-70 ${
                  view === 'years' ? 'bg-ink dark:bg-lime' : 'bg-canvas dark:bg-canvas-dark'
                }`}
              >
                <Text
                  className={`text-[15px] font-bold ${
                    view === 'years' ? 'text-lime dark:text-ink' : 'text-ink dark:text-ink-dark'
                  }`}
                >
                  {viewYear}
                </Text>
                <ChevronDown
                  size={14}
                  color={
                    view === 'years'
                      ? dark
                        ? ICON_COLORS.ink
                        : ICON_COLORS.lime
                      : ICON_COLORS.ink3
                  }
                />
              </Pressable>
            </View>

            {view === 'calendar' ? (
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => shiftMonth(-1)}
                  hitSlop={6}
                  accessibilityLabel="Mes anterior"
                  className="h-9 w-9 items-center justify-center rounded-full border border-line active:opacity-60 dark:border-line-dark"
                >
                  <ChevronLeft size={18} color={dark ? ICON_COLORS.inkDark : ICON_COLORS.ink} />
                </Pressable>
                <Pressable
                  onPress={() => shiftMonth(1)}
                  hitSlop={6}
                  accessibilityLabel="Mes siguiente"
                  className="h-9 w-9 items-center justify-center rounded-full border border-line active:opacity-60 dark:border-line-dark"
                >
                  <ChevronRight size={18} color={dark ? ICON_COLORS.inkDark : ICON_COLORS.ink} />
                </Pressable>
              </View>
            ) : null}
          </View>

          {view === 'calendar' ? (
            <GestureDetector gesture={swipe}>
              <View className="gap-1">
                <View className="flex-row">
                  {WEEKDAYS.map((w) => (
                    <View key={w} className="flex-1 items-center pb-1">
                      <Text className="text-[11px] font-semibold uppercase text-ink-3 dark:text-ink-3-dark">
                        {w}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Keyed by month: each page is a fresh mount that slides in
                from the side you paged toward (transform + opacity only). */}
                <Animated.View
                  key={`${viewYear}-${viewMonth}`}
                  entering={(direction === 1 ? FadeInRight : FadeInLeft).duration(220)}
                >
                  {grid.map((row, i) => (
                    <View key={i} className="flex-row">
                      {row.map((date, j) => {
                        if (!date) {
                          return <View key={j} className="h-11 flex-1" />;
                        }
                        const iso = todayISODate(date);
                        const selected = iso === value;
                        const isToday = iso === today;
                        return (
                          <View key={j} className="h-11 flex-1 items-center justify-center">
                            <Pressable
                              onPress={() => pick(iso)}
                              accessibilityLabel={longLabel(date)}
                              accessibilityState={{ selected }}
                              className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
                            >
                              {selected ? <GradientFill radius={20} /> : null}
                              <Text
                                className={`text-[15px] ${
                                  selected
                                    ? 'font-bold text-ink'
                                    : isToday
                                      ? 'font-bold text-ink dark:text-ink-dark'
                                      : 'font-medium text-ink dark:text-ink-dark'
                                }`}
                              >
                                {date.getDate()}
                              </Text>
                              {isToday && !selected ? (
                                <View className="absolute bottom-1 h-1 w-1 rounded-full bg-lime-ink dark:bg-lime" />
                              ) : null}
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </Animated.View>
              </View>
            </GestureDetector>
          ) : view === 'months' ? (
            <Animated.View entering={FadeIn.duration(160)} className="-mx-1 flex-row flex-wrap">
              {shortMonthNames.map((label, idx) => {
                const selected = idx === viewMonth;
                const isCurrent = viewYear === todayYear && idx === todayMonth - 1;
                return (
                  <View key={label} className="w-1/3 p-1">
                    <Pressable
                      onPress={() => {
                        selectionHaptic();
                        setCursor((c) => ({
                          ...c,
                          month: idx,
                          direction: idx >= c.month ? 1 : -1,
                        }));
                        setView('calendar');
                      }}
                      className={`h-14 items-center justify-center rounded-ctl active:opacity-70 ${
                        selected ? 'bg-lime' : 'bg-canvas dark:bg-canvas-dark'
                      }`}
                    >
                      <Text
                        className={`text-[15px] font-semibold ${
                          selected ? 'text-ink' : 'text-ink dark:text-ink-dark'
                        }`}
                      >
                        {label}
                      </Text>
                      {isCurrent && !selected ? (
                        <View className="absolute bottom-2 h-1 w-1 rounded-full bg-lime-ink dark:bg-lime" />
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(160)}>
              <ScrollView
                ref={yearsScroll}
                className="max-h-[300px]"
                showsVerticalScrollIndicator={false}
                // Open already scrolled to the year being shown.
                onLayout={() => {
                  const row = Math.floor(years.indexOf(viewYear) / 3);
                  yearsScroll.current?.scrollTo({
                    y: Math.max(0, (row - 2) * YEAR_ROW_HEIGHT),
                    animated: false,
                  });
                }}
              >
                {yearRows.map((row) => (
                  <View key={row[0]} className="-mx-1 flex-row" style={{ height: YEAR_ROW_HEIGHT }}>
                    {row.map((y) => {
                      const selected = y === viewYear;
                      return (
                        <View key={y} className="w-1/3 p-1">
                          <Pressable
                            onPress={() => {
                              selectionHaptic();
                              setCursor((c) => ({
                                ...c,
                                year: y,
                                direction: y >= c.year ? 1 : -1,
                              }));
                              setView('calendar');
                            }}
                            className={`flex-1 items-center justify-center rounded-ctl active:opacity-70 ${
                              selected ? 'bg-lime' : 'bg-canvas dark:bg-canvas-dark'
                            }`}
                          >
                            <Text
                              className={`text-[15px] font-semibold ${
                                selected ? 'text-ink' : 'text-ink dark:text-ink-dark'
                              }`}
                            >
                              {y}
                            </Text>
                            {y === todayYear && !selected ? (
                              <View className="absolute bottom-2 h-1 w-1 rounded-full bg-lime-ink dark:bg-lime" />
                            ) : null}
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </View>
      </BottomSheet>
    </>
  );
}
