import { Ionicons } from '@expo/vector-icons';
import { addDaysISO, formatDate, todayISODate } from '@repo/core/utils';
import { BottomSheet, Chip } from '@repo/ui';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Mon-first 6x7 grid of the given month; `null` cells pad the leading/trailing days. */
function monthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7; // Mon=0 .. Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = Array.from({ length: leading }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => {
    const [y, m, d] = value.split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : new Date();
  }, [value]);
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());

  const openPicker = () => {
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());
    setOpen(true);
  };

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

      <Pressable
        onPress={openPicker}
        className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
      >
        <Text className="text-base capitalize text-ink dark:text-ink-dark">
          {formatDate(value)}
        </Text>
        <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Elegir fecha">
        <View className="gap-3 px-5 pb-6">
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
        </View>
      </BottomSheet>
    </View>
  );
}
