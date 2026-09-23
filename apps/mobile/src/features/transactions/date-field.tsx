import { Ionicons } from '@expo/vector-icons';
import { addDaysISO, formatDate, todayISODate } from '@repo/core/utils';
import { BottomSheet, Chip } from '@repo/ui';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { capitalize, monthGrid, WEEKDAYS } from './calendar-grid';

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
        <ScrollView
          className="max-h-[480px]"
          contentContainerClassName="gap-3 px-5 pb-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} className="p-1">
              <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
            </Pressable>
            <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">
              {monthTitle} {viewYear}
            </Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={8} className="p-1">
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
      </BottomSheet>
    </View>
  );
}
