import { useAccounts, useProfile, useTransactions } from '@repo/core/hooks';
import {
  accountBalances,
  addDaysISO,
  categorySpendBreakdown,
  daysUntil,
  formatCurrency,
  groupByAccountCurrency,
  monthTotals,
  splitPendingByDate,
  todayISODate,
  totalBalancesByCurrency,
  visibleHomeLayout,
  type HomeLayoutItem,
  getDateFormat,
} from '@repo/core/utils';
import { Screen, StaggerItem, ICON_COLORS, useTabBarScrollPadding } from '@repo/ui';
import { useFocusEffect, useRouter } from 'expo-router';
import { Calendar, ChevronRight, Clock, Eye, EyeOff } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AccountIcon } from '../../../features/accounts/account-icon';
import { BudgetsCard } from '../../../features/home/budgets-card';
import { CategorySpendCard } from '../../../features/home/category-spend-card';
import { HomeSkeleton } from '../../../features/home/home-skeleton';
import { MonthPickerSheet } from '../../../features/home/month-picker-sheet';
import { MonthSwiper } from '../../../features/home/month-swiper';
import { RollingNumber } from '../../../features/home/rolling-number';
import { MonthlyTrendChart } from '../../../features/home/monthly-trend-chart';
import { NotificationBell } from '../../../features/notifications/notification-bell';
import { WeeklySpendCard } from '../../../features/home/weekly-spend-card';

// The balance's type, spelled out — the rolling digits need the exact line
// height (it's each wheel's window). Matches text-4xl font-bold tracking-tight.
const BALANCE_TEXT = {
  fontSize: 36,
  lineHeight: 42,
  fontWeight: '700' as const,
  letterSpacing: -0.9,
};

export default function HomeScreen() {
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: transactions, isLoading: loadingTx } = useTransactions();
  const { data: profile } = useProfile();
  const [hidden, setHidden] = useState(false);
  // Bumped each time Inicio comes into view — replays the balance's roll.
  const [rollKey, setRollKey] = useState(0);
  useFocusEffect(useCallback(() => setRollKey((k) => k + 1), []));
  const layoutOrder = useMemo(
    () => visibleHomeLayout(profile?.home_layout, profile?.home_hidden_items),
    [profile],
  );

  const active = useMemo(() => (accounts ?? []).filter((a) => !a.archived), [accounts]);
  const visibleAccounts = useMemo(() => active.filter((a) => a.show_on_home), [active]);
  // One pass over `transactions` for every account instead of one pass per
  // account — matters once either list is large (a full-history import is
  // thousands of rows).
  const accountBalancesById = useMemo(
    () => accountBalances(active, transactions ?? []),
    [active, transactions],
  );
  // The default currency only seeds the account-creation form now — it's no
  // longer a forced conversion target, so totals below group by each
  // account's own currency instead of blending them into one number.
  const currency = profile?.currency ?? active[0]?.currency ?? 'MXN';
  const balances = useMemo(
    () => totalBalancesByCurrency(active, transactions ?? []),
    [active, transactions],
  );
  const today = todayISODate();
  // Overdue (should've already happened) and upcoming (still ahead of
  // schedule) mean very different things, so they get two separate cards —
  // one urgent, one just a heads-up.
  const { overdue, upcoming } = useMemo(
    () => splitPendingByDate(transactions ?? [], today),
    [transactions, today],
  );
  const nearestUpcomingDays = useMemo(
    () =>
      upcoming.length
        ? Math.min(...upcoming.map((t) => daysUntil(t.transaction_date, today)))
        : null,
    [upcoming, today],
  );
  const loading = loadingAccounts || loadingTx;

  // Seeds the initial month only — frozen on purpose, re-reading it on every
  // render would reset `selectedYear`/`selectedMonthIdx` back to "now"
  // whenever the user has navigated to a different month.
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(() => new Date().getMonth());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const monthDate = useMemo(
    () => new Date(selectedYear, selectedMonthIdx, 1),
    [selectedYear, selectedMonthIdx],
  );
  const selectedMonth = `${selectedYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`;
  const monthLabel = getDateFormat('es-MX', { month: 'long' }).format(monthDate);
  const yearLabel = String(selectedYear);
  const monthStart = `${selectedMonth}-01`;
  const monthEnd = todayISODate(new Date(selectedYear, selectedMonthIdx + 1, 0));
  // Derived from `today` (read fresh every render, not memoized/frozen) — a
  // session left open across midnight should re-enable "mes siguiente"
  // without needing a remount, the moment anything else causes this screen
  // to re-render.
  const [todayYear, todayMonth] = today.split('-').map(Number);
  const isCurrentMonth = selectedYear === todayYear && selectedMonthIdx === (todayMonth ?? 1) - 1;

  const shiftMonth = (delta: number) => {
    const next = new Date(selectedYear, selectedMonthIdx + delta, 1);
    setSelectedYear(next.getFullYear());
    setSelectedMonthIdx(next.getMonth());
  };

  const month = useMemo(
    () => monthTotals(transactions ?? [], selectedMonth),
    [transactions, selectedMonth],
  );
  // One breakdown per currency present in the user's transactions — never
  // blended together (see `groupByAccountCurrency`).
  const categoryBreakdowns = useMemo(() => {
    return groupByAccountCurrency(transactions ?? [])
      .map((g) => ({
        currency: g.currency,
        breakdown: categorySpendBreakdown(g.transactions, selectedMonth),
      }))
      .filter((g) => g.breakdown.length > 0);
  }, [transactions, selectedMonth]);

  const openMonth = (type: 'income' | 'expense') =>
    router.push({
      pathname: '/(app)/transactions',
      params: { type, from: monthStart, to: monthEnd },
    });
  const openAccount = (accountId: string) =>
    router.push({ pathname: '/(app)/settings/accounts/[id]', params: { id: accountId } });
  const monthYearLabel = `${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)} ${yearLabel}`;
  const openCategory = (categoryId: string) =>
    router.push({
      pathname: '/(app)/category-month-spending',
      params: { categoryId, month: selectedMonth, label: monthYearLabel },
    });
  const openMonthlySpending = () =>
    router.push({
      pathname: '/(app)/monthly-spending',
      params: { month: selectedMonth, label: monthYearLabel },
    });

  // Every card the user can reorder from Opciones › Personalizar inicio —
  // rendered below in `layoutOrder`'s sequence. The month selector, balance
  // card, and income/expense totals aren't here: they're the screen's
  // anchor and always come first.
  const cards: Record<HomeLayoutItem, ReactNode> = {
    pending:
      overdue.length > 0 ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(app)/transactions',
              params: { pending: '1', to: addDaysISO(today, -1) },
            })
          }
          className="flex-row items-center gap-3 rounded-2xl bg-warning-tint p-4 active:opacity-80 dark:bg-warning-tint-dark"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark">
            <Clock size={20} color={dark ? ICON_COLORS.warningDark : ICON_COLORS.warning} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-warning dark:text-warning-dark">
              {overdue.length} movimiento{overdue.length === 1 ? '' : 's'} pendiente
              {overdue.length === 1 ? '' : 's'}
            </Text>
            <Text className="text-xs text-warning opacity-80 dark:text-warning-dark">
              Aún no se han realizado, toca para revisarlos
            </Text>
          </View>
          <ChevronRight size={18} color={dark ? ICON_COLORS.warningDark : ICON_COLORS.warning} />
        </Pressable>
      ) : null,

    upcoming:
      upcoming.length > 0 ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(app)/transactions',
              params: { pending: '1', from: today },
            })
          }
          className="flex-row items-center gap-3 rounded-2xl bg-lime-tint p-4 active:opacity-80 dark:bg-lime-tint-dark"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark">
            <Calendar size={20} color={dark ? ICON_COLORS.limeInkDark : ICON_COLORS.limeInk} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-lime-ink dark:text-lime-ink-dark">
              {nearestUpcomingDays === 0
                ? `${upcoming.length} movimiento${upcoming.length === 1 ? '' : 's'} por realizar hoy`
                : `${upcoming.length} movimiento${upcoming.length === 1 ? '' : 's'} próximo${upcoming.length === 1 ? '' : 's'}`}
            </Text>
            <Text className="text-xs text-lime-ink opacity-80 dark:text-lime-ink-dark">
              {nearestUpcomingDays === 0
                ? 'Programado para hoy, toca para revisarlo'
                : `El más cercano en ${nearestUpcomingDays} día${nearestUpcomingDays === 1 ? '' : 's'}`}
            </Text>
          </View>
          <ChevronRight size={18} color={dark ? ICON_COLORS.limeInkDark : ICON_COLORS.limeInk} />
        </Pressable>
      ) : null,

    budgets: <BudgetsCard />,

    categorySpend:
      categoryBreakdowns.length === 0 ? (
        <CategorySpendCard
          breakdown={[]}
          currency={currency}
          onSeeAll={openMonthlySpending}
          onSelectCategory={openCategory}
        />
      ) : (
        <View className="gap-3">
          {categoryBreakdowns.map((g) => (
            <View key={g.currency} className="gap-1.5">
              {categoryBreakdowns.length > 1 ? (
                <Text className="px-1 text-xs font-semibold text-ink-3 dark:text-ink-3-dark">
                  {g.currency}
                </Text>
              ) : null}
              <CategorySpendCard
                breakdown={g.breakdown}
                currency={g.currency}
                onSeeAll={openMonthlySpending}
                onSelectCategory={openCategory}
              />
            </View>
          ))}
        </View>
      ),

    weeklySpend: <WeeklySpendCard onPress={() => router.push('/(app)/analytics')} />,

    monthlyTrend: <MonthlyTrendChart />,

    accounts: (
      <View className="gap-2">
        <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">Tus cuentas</Text>
        <View className="rounded-card border border-line dark:border-line-dark">
          {visibleAccounts.map((a, i) => (
            <Pressable
              key={a.id}
              onPress={() => openAccount(a.id)}
              className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-60 ${
                i > 0 ? 'border-t border-line dark:border-line-dark' : ''
              }`}
            >
              <AccountIcon account={a} />
              <Text className="flex-1 text-[15px] font-medium text-ink dark:text-ink-dark">
                {a.name}
              </Text>
              <Text className="text-[15px] font-semibold text-ink dark:text-ink-dark">
                {hidden ? '•••' : formatCurrency(accountBalancesById.get(a.id) ?? 0, a.currency)}
              </Text>
            </Pressable>
          ))}
          {visibleAccounts.length === 0 ? (
            <Text className="px-4 py-4 text-sm text-ink-2 dark:text-ink-2-dark">
              {active.length === 0
                ? 'Aún no tienes cuentas.'
                : 'No tienes cuentas visibles aquí — actívalas desde Cuenta › Mostrar en inicio.'}
            </Text>
          ) : null}
        </View>
      </View>
    ),
  };

  return (
    <Screen edges={['top']} className="gap-5">
      <View className="relative">
        <MonthSwiper
          yearLabel={yearLabel}
          monthLabel={monthLabel}
          isCurrentMonth={isCurrentMonth}
          monthKey={selectedMonth}
          onShift={shiftMonth}
          onOpenPicker={() => setMonthPickerOpen(true)}
        />
        {/* Pinned to the row's right edge so the month selector stays centered. */}
        <View className="absolute bottom-0 right-0 top-0 justify-center">
          <NotificationBell />
        </View>
      </View>

      <MonthPickerSheet
        visible={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        year={selectedYear}
        month={selectedMonthIdx}
        onSelect={(y, m) => {
          setSelectedYear(y);
          setSelectedMonthIdx(m);
        }}
      />

      {loading ? (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollPadding }}
        >
          <HomeSkeleton />
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollPadding }}
        >
          <View className="rounded-card bg-surface p-5 dark:bg-surface-dark">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
                Balance total
              </Text>
              <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
                {hidden ? (
                  <Eye size={20} color={ICON_COLORS.ink3} />
                ) : (
                  <EyeOff size={20} color={ICON_COLORS.ink3} />
                )}
              </Pressable>
            </View>
            {balances.length === 0 ? (
              <Text className="mt-1 text-4xl font-bold tracking-tight text-ink dark:text-ink-dark">
                {hidden ? '• • • •' : formatCurrency(0, currency)}
              </Text>
            ) : (
              <View className={balances.length > 1 ? 'mt-1 gap-1' : undefined}>
                {balances.map((b) => (
                  <View
                    key={b.currency}
                    className={balances.length > 1 ? 'flex-row items-end gap-1.5' : undefined}
                  >
                    {hidden ? (
                      <Text className="text-4xl font-bold tracking-tight text-ink dark:text-ink-dark">
                        • • • •
                      </Text>
                    ) : (
                      <RollingNumber
                        value={formatCurrency(b.total, b.currency)}
                        textStyle={BALANCE_TEXT}
                        className="text-ink dark:text-ink-dark"
                        trigger={rollKey}
                      />
                    )}
                    {balances.length > 1 ? (
                      <Text className="text-sm font-semibold text-ink-3 dark:text-ink-3-dark">
                        {b.currency}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Fixed, like the balance card above — not user-reorderable/hideable. One
          row per currency that actually moved money this month; "sin movimientos"
          when none did. */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => openMonth('income')}
              className="flex-1 rounded-2xl bg-surface p-4 active:opacity-70 dark:bg-surface-dark"
            >
              <Text className="text-xs capitalize text-ink-2 dark:text-ink-2-dark">Ingresos</Text>
              {month.length === 0 ? (
                <Text className="mt-1 text-xl font-bold text-pos dark:text-pos-dark">
                  {hidden ? '•••' : formatCurrency(0, currency)}
                </Text>
              ) : (
                month.map((m) => (
                  <Text
                    key={m.currency}
                    className="mt-1 text-xl font-bold text-pos dark:text-pos-dark"
                  >
                    {hidden ? '•••' : formatCurrency(m.income, m.currency)}
                    {month.length > 1 ? ` ${m.currency}` : ''}
                  </Text>
                ))
              )}
            </Pressable>
            <Pressable
              onPress={() => openMonth('expense')}
              className="flex-1 rounded-2xl bg-surface p-4 active:opacity-70 dark:bg-surface-dark"
            >
              <Text className="text-xs capitalize text-ink-2 dark:text-ink-2-dark">Gastos</Text>
              {month.length === 0 ? (
                <Text className="mt-1 text-xl font-bold text-danger dark:text-danger-dark">
                  {hidden ? '•••' : formatCurrency(0, currency)}
                </Text>
              ) : (
                month.map((m) => (
                  <Text
                    key={m.currency}
                    className="mt-1 text-xl font-bold text-danger dark:text-danger-dark"
                  >
                    {hidden ? '•••' : formatCurrency(m.expense, m.currency)}
                    {month.length > 1 ? ` ${m.currency}` : ''}
                  </Text>
                ))
              )}
            </Pressable>
          </View>

          {layoutOrder.map((key, i) => (
            <StaggerItem key={key} index={i}>
              {cards[key]}
            </StaggerItem>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
