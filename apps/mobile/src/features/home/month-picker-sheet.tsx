import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@repo/ui';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { capitalize } from '../transactions/calendar-grid';

const YEAR_COUNT = 20;

function monthNames(): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    capitalize(new Date(2000, i, 1).toLocaleDateString('es-MX', { month: 'long' })),
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Currently selected month (0-11) and year. */
  year: number;
  month: number;
  /** Latest selectable month — months/years after it are disabled. Defaults to now. */
  maxDate?: Date;
  onSelect: (year: number, month: number) => void;
}

/** Two-step picker: a grid of months for one year, with a year list one tap away. */
export function MonthPickerSheet({ visible, onClose, year, month, maxDate, onSelect }: Props) {
  const [view, setView] = useState<'months' | 'years'>('months');
  const [viewYear, setViewYear] = useState(year);

  // Reset to the selected year/month grid each time the sheet opens.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setViewYear(year);
      setView('months');
    }
  }

  const max = maxDate ?? new Date();
  const maxYear = max.getFullYear();
  const maxMonth = max.getMonth();
  const years = Array.from({ length: YEAR_COUNT }, (_, i) => maxYear - i);

  const pickMonth = (m: number) => {
    onSelect(viewYear, m);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {view === 'months' ? (
        <>
          <View className="items-center pb-2 pt-1">
            <Pressable
              onPress={() => setView('years')}
              hitSlop={8}
              className="flex-row items-center gap-1 rounded-full px-3 py-1.5 active:opacity-60"
            >
              <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">{viewYear}</Text>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </Pressable>
          </View>
          <View className="flex-row flex-wrap px-3.5 pb-8">
            {monthNames().map((label, idx) => {
              const disabled = viewYear > maxYear || (viewYear === maxYear && idx > maxMonth);
              const selected = viewYear === year && idx === month;
              return (
                <View key={label} className="w-1/3 p-1.5">
                  <Pressable
                    disabled={disabled}
                    onPress={() => pickMonth(idx)}
                    className={`items-center justify-center rounded-xl py-3.5 active:opacity-70 ${
                      selected ? 'bg-lime' : 'bg-canvas dark:bg-canvas-dark'
                    }`}
                  >
                    <Text
                      className={`text-[14px] font-semibold capitalize ${
                        disabled
                          ? 'text-ink-3 opacity-40 dark:text-ink-3-dark'
                          : selected
                            ? 'text-ink'
                            : 'text-ink dark:text-ink-dark'
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <View className="flex-row items-center px-5 pb-2 pt-1">
            <Pressable
              onPress={() => setView('months')}
              hitSlop={8}
              className="flex-row items-center gap-1 active:opacity-60"
            >
              <Ionicons name="chevron-back" size={18} color="#9CA3AF" />
              <Text className="text-[15px] font-semibold text-ink-2 dark:text-ink-2-dark">
                {viewYear}
              </Text>
            </Pressable>
          </View>
          <ScrollView className="max-h-[420px]" contentContainerClassName="pb-8">
            {years.map((y) => (
              <Pressable
                key={y}
                onPress={() => {
                  setViewYear(y);
                  setView('months');
                }}
                className="flex-row items-center justify-between border-t border-line px-5 py-3.5 dark:border-line-dark"
              >
                <Text
                  className={`text-[15px] ${
                    y === year
                      ? 'font-bold text-ink dark:text-ink-dark'
                      : 'text-ink-2 dark:text-ink-2-dark'
                  }`}
                >
                  {y}
                </Text>
                {y === year ? <Ionicons name="checkmark" size={18} color="#4D7C0F" /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
    </BottomSheet>
  );
}
