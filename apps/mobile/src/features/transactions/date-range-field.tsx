import { currentLocale } from '@repo/core/i18n';
import { formatDate, todayISODate, getDateFormat } from '@repo/core/utils';
import { BottomSheet, Chip, SegmentedControl, ICON_COLORS } from '@repo/ui';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { capitalize, monthGrid, weekdayInitials } from './calendar-grid';

export interface DateRangeFieldProps {
  /** Inclusive `YYYY-MM-DD` bounds. Equal values mean a single day. `null` = no filter. */
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
  /** Custom trigger, e.g. a full-width row inside a filters sheet. Defaults to a chip-style button. */
  renderTrigger?: (props: { label: string; active: boolean; onPress: () => void }) => ReactNode;
  /**
   * Always pick a range — hides the Día/Rango toggle and never defaults to
   * single-day mode. Without this, a picker that opens with nothing selected
   * yet starts in "Día" mode, so the very first tap commits a single date and
   * closes the sheet before a second date can be picked. Use this whenever
   * the field is ALWAYS meant to be a range (e.g. a custom budget period),
   * as opposed to a "day or range" filter where single-day is a real choice.
   */
  forceRangeMode?: boolean;
}

function monthBounds(date: Date): [string, string] {
  const first = todayISODate(new Date(date.getFullYear(), date.getMonth(), 1));
  const last = todayISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  return [first, last];
}

/** Date filter field: a single day or an inclusive range, picked from one calendar. */
export function DateRangeField({
  from,
  to,
  onChange,
  renderTrigger,
  forceRangeMode = false,
}: DateRangeFieldProps) {
  const { t } = useTranslation(['transactions', 'common']);
  const initialMode = forceRangeMode || (from && to && from !== to) ? 'range' : 'day';
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'day' | 'range'>(initialMode);
  const [rangeStart, setRangeStart] = useState<string | null>(from);
  const [rangeEnd, setRangeEnd] = useState<string | null>(to);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const openPicker = () => {
    const anchor = from ? new Date(from) : new Date();
    setViewYear(anchor.getFullYear());
    setViewMonth(anchor.getMonth());
    setMode(forceRangeMode || (from && to && from !== to) ? 'range' : 'day');
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
    getDateFormat(currentLocale(), { month: 'long' }).format(new Date(viewYear, viewMonth, 1)),
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
    ? t('date.allDates')
    : from === to
      ? formatDate(from)
      : `${formatDate(from)} – ${formatDate(to ?? from)}`;

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ label, active: Boolean(from), onPress: openPicker })
      ) : (
        <Pressable
          onPress={openPicker}
          className="h-10 flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
        >
          <Calendar size={14} color={from ? ICON_COLORS.limeInk : ICON_COLORS.ink3} />
          <Text
            className={`text-[13px] font-semibold ${from ? 'text-lime-ink dark:text-lime-ink-dark' : 'text-ink-2 dark:text-ink-2-dark'}`}
          >
            {label}
          </Text>
        </Pressable>
      )}

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={t('date.title')}
        headerAction={
          from ? (
            <Pressable onPress={clear} hitSlop={8}>
              <Text className="text-[13px] font-semibold text-danger dark:text-danger-dark">
                {t('date.clear')}
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
          {forceRangeMode ? null : (
            <SegmentedControl
              options={[
                { value: 'day' as const, label: t('date.day') },
                { value: 'range' as const, label: t('date.range') },
              ]}
              value={mode}
              onChange={(v) => {
                setMode(v);
                setRangeStart(from);
                setRangeEnd(to);
              }}
            />
          )}

          <View className="flex-row gap-2">
            <Chip
              label={t('common:today')}
              onPress={() => {
                onChange(today, today);
                setOpen(false);
              }}
            />
            <Chip
              label={t('date.thisMonth')}
              onPress={() => {
                const [first, last] = monthBounds(new Date());
                onChange(first, last);
                setOpen(false);
              }}
            />
          </View>

          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} className="p-1">
              <ChevronLeft size={20} color={ICON_COLORS.ink3} />
            </Pressable>
            <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">
              {monthTitle} {viewYear}
            </Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={8} className="p-1">
              <ChevronRight size={20} color={ICON_COLORS.ink3} />
            </Pressable>
          </View>

          <View className="flex-row">
            {weekdayInitials().map((w, i) => (
              <View key={i} className="flex-1 items-center">
                <Text className="text-xs font-semibold text-ink-3 dark:text-ink-3-dark">{w}</Text>
              </View>
            ))}
          </View>

          {grid.map((row, i) => (
            <View key={i} className="flex-row">
              {row.map((date, j) => {
                if (!date) {
                  return (
                    <View key={j} className="flex-1 items-center py-1.5">
                      <View className="h-9 w-9" />
                    </View>
                  );
                }
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
              {t('date.pickEnd')}
            </Text>
          ) : null}
        </ScrollView>
      </BottomSheet>
    </>
  );
}
