import { Ionicons } from '@expo/vector-icons';
import { formatDate, todayISODate } from '@repo/core/utils';
import { BottomSheet, Chip, SegmentedControl } from '@repo/ui';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { capitalize, monthGrid, WEEKDAYS } from './calendar-grid';

const MODE_OPTIONS = [
  { value: 'day' as const, label: 'Día' },
  { value: 'range' as const, label: 'Rango' },
];

export interface DateRangeFieldProps {
  /** Inclusive `YYYY-MM-DD` bounds. Equal values mean a single day. `null` = no filter. */
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
}

function monthBounds(date: Date): [string, string] {
  const first = todayISODate(new Date(date.getFullYear(), date.getMonth(), 1));
  const last = todayISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  return [first, last];
}

/** Date filter field: a single day or an inclusive range, picked from one calendar. */
export function DateRangeField({ from, to, onChange }: DateRangeFieldProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'day' | 'range'>(from && to && from !== to ? 'range' : 'day');
  const [rangeStart, setRangeStart] = useState<string | null>(from);
  const [rangeEnd, setRangeEnd] = useState<string | null>(to);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const openPicker = () => {
    const anchor = from ? new Date(from) : new Date();
    setViewYear(anchor.getFullYear());
    setViewMonth(anchor.getMonth());
    setMode(from && to && from !== to ? 'range' : 'day');
    setRangeStart(from);
    setRangeEnd(to);
    setOpen(true);
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const today = todayISODate();
  const grid = monthGrid(viewYear, viewMonth);
  const monthTitle = capitalize(
    new Date(viewYear, viewMonth, 1).toLocaleDateString('es-MX', { month: 'long' }),
  );

  const clear = () => {
    setRangeStart(null);
    setRangeEnd(null);
    onChange(null, null);
    setOpen(false);
  };

  const pickDay = (iso: string) => {
    if (mode === 'day') {
      onChange(iso, iso);
      setOpen(false);
      return;
    }
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(iso);
      setRangeEnd(null);
      return;
    }
    const [s, e] = iso < rangeStart ? [iso, rangeStart] : [rangeStart, iso];
    setRangeStart(s);
    setRangeEnd(e);
    onChange(s, e);
    setOpen(false);
  };

  const label = !from
    ? 'Todas las fechas'
    : from === to
      ? formatDate(from)
      : `${formatDate(from)} – ${formatDate(to ?? from)}`;

  return (
    <>
      <Pressable
        onPress={openPicker}
        className="h-10 flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
      >
        <Ionicons name="calendar-outline" size={14} color={from ? '#4D7C0F' : '#9CA3AF'} />
        <Text
          className={`text-[13px] font-semibold ${from ? 'text-lime-ink dark:text-lime-ink-dark' : 'text-ink-2 dark:text-ink-2-dark'}`}
        >
          {label}
        </Text>
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Fecha"
        headerAction={
          from ? (
            <Pressable onPress={clear} hitSlop={8}>
              <Text className="text-[13px] font-semibold text-danger dark:text-danger-dark">
                Limpiar
              </Text>
            </Pressable>
          ) : undefined
        }
      >
        <ScrollView
          className="max-h-[520px]"
          contentContainerClassName="gap-3 px-5 pb-6"
          keyboardShouldPersistTaps="handled"
        >
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onChange={(v) => {
              setMode(v);
              setRangeStart(from);
              setRangeEnd(to);
            }}
          />

          <View className="flex-row gap-2">
            <Chip
              label="Hoy"
              onPress={() => {
                onChange(today, today);
                setOpen(false);
              }}
            />
            <Chip
              label="Este mes"
              onPress={() => {
                const [first, last] = monthBounds(new Date());
                onChange(first, last);
                setOpen(false);
              }}
            />
          </View>

          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} className="p-1">
              <Ionicons name="chevron-back" size={20} color="#1A1D21" />
            </Pressable>
            <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">
              {monthTitle} {viewYear}
            </Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={8} className="p-1">
              <Ionicons name="chevron-forward" size={20} color="#1A1D21" />
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
                if (!date) return <View key={j} className="flex-1 py-1.5" />;
                const iso = todayISODate(date);
                const isStart = iso === rangeStart;
                const isEnd = iso === rangeEnd;
                const inRange = Boolean(
                  rangeStart && rangeEnd && iso > rangeStart && iso < rangeEnd,
                );
                const isToday = iso === today;
                const edge = isStart || isEnd;

                return (
                  <View
                    key={j}
                    className={`flex-1 py-1.5 ${
                      inRange || (isStart && rangeEnd) || (isEnd && rangeStart)
                        ? 'bg-lime-tint dark:bg-lime-tint-dark'
                        : ''
                    } ${isStart ? 'rounded-l-full' : ''} ${isEnd ? 'rounded-r-full' : ''}`}
                  >
                    <Pressable onPress={() => pickDay(iso)} className="items-center justify-center">
                      <View
                        className={`h-9 w-9 items-center justify-center rounded-full ${edge ? 'bg-lime' : ''}`}
                      >
                        <Text
                          className={`text-[14px] ${
                            edge
                              ? 'font-bold text-ink'
                              : inRange
                                ? 'font-semibold text-lime-ink dark:text-lime-ink-dark'
                                : isToday
                                  ? 'font-bold text-lime-ink dark:text-lime-ink-dark'
                                  : 'text-ink dark:text-ink-dark'
                          }`}
                        >
                          {date.getDate()}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}

          {mode === 'range' && rangeStart && !rangeEnd ? (
            <Text className="text-center text-[13px] text-ink-2 dark:text-ink-2-dark">
              Elige la fecha final
            </Text>
          ) : null}
        </ScrollView>
      </BottomSheet>
    </>
  );
}
