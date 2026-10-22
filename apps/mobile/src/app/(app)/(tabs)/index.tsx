import {
  useAccountBalanceEffects,
  useAccounts,
  useCategories,
  useMonthlyCategoryTotals,
  useProfile,
  useTransactions,
} from '@repo/core/hooks';
import {
  addDaysISO,
  balancesFromEffects,
  categorySpendFromSummary,
  daysUntil,
  currencyCodeShown,
  formatCurrency,
  formatCurrencyLabeled,
  monthTotalsFromSummary,
  splitPendingByDate,
  todayISODate,
  totalsByCurrencyFromBalances,
  type HomeLayoutItem,
  getDateFormat,
} from '@repo/core/utils';
import { Screen, ICON_COLORS, useIsDesktop } from '@repo/ui';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Check, ChevronRight, Clock, Eye, EyeOff, LayoutGrid } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { AccountIcon } from '../../../features/accounts/account-icon';
import { CardScrollView } from '../../../features/design/card-scroll-view';
import { BudgetsCard } from '../../../features/home/budgets-card';
import { CategorySpendCard } from '../../../features/home/category-spend-card';
import { useProgressiveCount, WidgetPlaceholder } from '../../../features/home/deferred-widgets';
import {
  AddWidgetsSheet,
  EditToolbar,
  FixedInEdit,
  useHomeEditor,
} from '../../../features/home/home-editor';
import { WidgetGrid } from '../../../features/home/widget-grid';
import { HomeSkeleton } from '../../../features/home/home-skeleton';
import { MonthPickerSheet } from '../../../features/home/month-picker-sheet';
import { MonthSwiper } from '../../../features/home/month-swiper';
import { RollingNumber } from '../../../features/home/rolling-number';
import { MonthlyTrendChart } from '../../../features/home/monthly-trend-chart';
import { NotificationBell } from '../../../features/notifications/notification-bell';
import { WeeklySpendCard } from '../../../features/home/weekly-spend-card';
import { useTabBarAction } from '../../../features/navigation/floating-tab-bar';

// The balance's type, spelled out — the rolling digits need the exact line
// height (it's each wheel's window). Matches text-4xl font-bold tracking-tight.
const BALANCE_TEXT = {
  fontSize: 36,
  lineHeight: 42,
  fontWeight: '700' as const,
  letterSpacing: -0.9,
};

// Stable, so the pending query's key (and cache entry) doesn't change per render.
const PENDING_FILTER = { isCompleted: false } as const;

// Widgets rendered with the screen's first frame — about what fits on screen
// under the balance and income/expense cards.
const INITIAL_WIDGETS = 1;

export default function HomeScreen() {
  const desktop = useIsDesktop();
  // The three headline numbers fit side by side only on a roomy window;
  // on a small desktop the balance gets its own row.
  const { width: windowWidth } = useWindowDimensions();
  const kpisInline = desktop && windowWidth >= 1280;
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  // Totals come pre-summed from Postgres (see supabase/summaries.ts) —
  // Inicio no longer downloads and re-scans the whole transaction history.
  const { data: balanceEffects, isLoading: loadingBalances } = useAccountBalanceEffects();
  const { data: summary, isLoading: loadingSummary } = useMonthlyCategoryTotals();
  const { data: categories } = useCategories();
  // Only what's still pending, for the two reminder cards.
  const { data: pending } = useTransactions(PENDING_FILTER);
  const { data: profile } = useProfile();
  const [hidden, setHidden] = useState(false);
  // Bumped each time Inicio comes into view — replays the balance's roll.
  const [rollKey, setRollKey] = useState(0);
  useFocusEffect(useCallback(() => setRollKey((k) => k + 1), []));
  // The widget matrix — its own layout per device (4 columns on desktop, 2
  // on phones). Edit mode ("Personalizar") works on a draft, saved on "Listo".
  const device = desktop ? 'desktop' : 'mobile';
  const editor = useHomeEditor(profile ?? undefined, device);
  const editing = editor.editing;
  const [dragging, setDragging] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // While editing, the navbar's action (the "+") becomes "Listo".
  useTabBarAction(
    editing ? { icon: Check, accessibilityLabel: 'Listo', onPress: editor.done } : null,
  );
  // Leaving Inicio mid-edit keeps what you did, like tapping "Listo".
  const doneRef = useRef(editor.done);
  useEffect(() => {
    doneRef.current = editor.done;
  });
  useFocusEffect(useCallback(() => () => doneRef.current(), []));
  // Opciones › Inicio links here with `?edit=1` to open edit mode.
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const startRef = useRef(editor.start);
  useEffect(() => {
    startRef.current = editor.start;
  });
  useEffect(() => {
    if (edit === '1' && profile) {
      startRef.current();
      router.setParams({ edit: undefined });
    }
  }, [edit, profile, router]);
  // The widgets mount progressively: the first ones with the screen, the
  // rest one per frame right after (see useProgressiveCount) — in the
  // order they sit on screen, top to bottom.
  const mountOrder = useMemo(
    () => [...editor.items].sort((a, b) => a.y - b.y || a.x - b.x).map((it) => it.id),
    [editor.items],
  );
  const mountedWidgets = useProgressiveCount(mountOrder.length, INITIAL_WIDGETS);

  const active = useMemo(() => (accounts ?? []).filter((a) => !a.archived), [accounts]);
  const visibleAccounts = useMemo(() => active.filter((a) => a.show_on_home), [active]);
  const accountBalancesById = useMemo(
    () => balancesFromEffects(active, balanceEffects ?? []),
    [active, balanceEffects],
  );
  // The default currency only seeds the account-creation form now — it's no
  // longer a forced conversion target, so totals below group by each
  // account's own currency instead of blending them into one number.
  const currency = profile?.currency ?? active[0]?.currency ?? 'MXN';
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const balances = useMemo(
    () => totalsByCurrencyFromBalances(active, accountBalancesById),
    [active, accountBalancesById],
  );
  const today = todayISODate();
  // Overdue (should've already happened) and upcoming (still ahead of
  // schedule) mean very different things, so they get two separate cards —
  // one urgent, one just a heads-up.
  const { overdue, upcoming } = useMemo(
    // Pending transfers a linked person will send you aren't yours to do.
    () =>
      splitPendingByDate(
        (pending ?? []).filter((t) => !t.is_peer_mirror),
        today,
      ),
    [pending, today],
  );
  const nearestUpcomingDays = useMemo(
    () =>
      upcoming.length
        ? Math.min(...upcoming.map((t) => daysUntil(t.transaction_date, today)))
        : null,
    [upcoming, today],
  );
  const loading = loadingAccounts || loadingBalances || loadingSummary;

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
    () => monthTotalsFromSummary(summary ?? [], selectedMonth),
    [summary, selectedMonth],
  );
  // One breakdown per currency present in the user's transactions — never
  // blended together (see `groupByAccountCurrency`).
  const categoryBreakdowns = useMemo(
    () => categorySpendFromSummary(summary ?? [], selectedMonth, categories ?? []),
    [summary, selectedMonth, categories],
  );

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
          className="flex-1 flex-row items-center gap-3 bg-warning-tint p-4 active:opacity-80 dark:bg-warning-tint-dark"
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
          className="flex-1 flex-row items-center gap-3 bg-lime-tint p-4 active:opacity-80 dark:bg-lime-tint-dark"
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

    budgets: <BudgetsCard fill />,

    categorySpend:
      categoryBreakdowns.length === 0 ? (
        <CategorySpendCard
          breakdown={[]}
          currency={currency}
          onSeeAll={openMonthlySpending}
          onSelectCategory={openCategory}
          fill
        />
      ) : categoryBreakdowns.length === 1 ? (
        <CategorySpendCard
          breakdown={categoryBreakdowns[0]!.breakdown}
          currency={categoryBreakdowns[0]!.currency}
          onSeeAll={openMonthlySpending}
          onSelectCategory={openCategory}
          fill
        />
      ) : (
        // One card per currency, stacked — the whole stack scrolls in the cell.
        <CardScrollView className="flex-1" contentContainerClassName="gap-3">
          {categoryBreakdowns.map((g) => (
            <View key={g.currency} className="gap-1.5">
              <Text className="px-1 text-xs font-semibold text-ink-3 dark:text-ink-3-dark">
                {g.currency}
              </Text>
              <CategorySpendCard
                breakdown={g.breakdown}
                currency={g.currency}
                onSeeAll={openMonthlySpending}
                onSelectCategory={openCategory}
              />
            </View>
          ))}
        </CardScrollView>
      ),

    weeklySpend: <WeeklySpendCard fill onPress={() => router.push('/(app)/analytics')} />,

    monthlyTrend: <MonthlyTrendChart fill />,

    // Fills its grid cell: the header stays put and the list scrolls.
    accounts: (
      <View className="flex-1 gap-2 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">Tus cuentas</Text>
          <Pressable onPress={() => router.push('/(app)/settings/accounts')} hitSlop={8}>
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              Ver todas ›
            </Text>
          </Pressable>
        </View>
        <CardScrollView
          className="shrink grow-0 overflow-hidden rounded-card border border-line dark:border-line-dark"
          gutter={false}
        >
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
        </CardScrollView>
      </View>
    ),
  };

  const balanceCard = (
    <View className="rounded-card bg-surface p-5 dark:bg-surface-dark">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">Balance total</Text>
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
              {balances.length > 1 && !currencyCodeShown(b.currency) ? (
                <Text className="text-sm font-semibold text-ink-3 dark:text-ink-3-dark">
                  {b.currency}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // Fixed, like the balance card above — not user-reorderable/hideable. One
  // row per currency that actually moved money this month; "sin movimientos"
  // when none did.
  const monthCards = (
    <View className={desktop ? 'flex-1 flex-row gap-3' : 'flex-row gap-3'}>
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
            <Text key={m.currency} className="mt-1 text-xl font-bold text-pos dark:text-pos-dark">
              {hidden
                ? '•••'
                : month.length > 1
                  ? formatCurrencyLabeled(m.income, m.currency)
                  : formatCurrency(m.income, m.currency)}
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
              {hidden
                ? '•••'
                : month.length > 1
                  ? formatCurrencyLabeled(m.expense, m.currency)
                  : formatCurrency(m.expense, m.currency)}
            </Text>
          ))
        )}
      </Pressable>
    </View>
  );

  // A widget not mounted yet shows a skeleton in its cell (its cell fades
  // in once it is — see `WidgetGrid`).
  const renderWidget = (key: HomeLayoutItem) =>
    !editing && mountOrder.indexOf(key) >= mountedWidgets ? <WidgetPlaceholder /> : cards[key];

  const grid = (
    <WidgetGrid
      items={editor.items}
      device={device}
      editing={editing}
      longPress={!desktop}
      renderWidget={renderWidget}
      onChange={editor.setItems}
      onRemove={editor.remove}
      onDraggingChange={setDragging}
    />
  );

  // Edit mode: the matrix alone, full width — the widgets to add live in a
  // floating sheet opened from the edit bar, not beside what you arrange.
  const editGrid = (
    <View>
      {editor.items.length === 0 ? (
        <View className="mb-3 items-center rounded-card border-2 border-dashed border-line px-6 py-6 dark:border-line-dark">
          <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
            Tu inicio está vacío
          </Text>
          <Text className="mt-0.5 text-xs text-ink-3 dark:text-ink-3-dark">
            Toca Agregar para sumar widgets.
          </Text>
        </View>
      ) : null}
      {grid}
    </View>
  );

  // Phones only: on desktop it's "Personalizar dashboard" in the sidebar's
  // Opciones (which links here with `?edit=1`).
  const customizeButton = (
    <Pressable
      onPress={editor.start}
      accessibilityRole="button"
      accessibilityLabel="Personalizar inicio"
      hitSlop={6}
      className="h-9 w-9 items-center justify-center rounded-full border border-line bg-surface active:opacity-70 dark:border-line-dark dark:bg-surface-dark"
    >
      <LayoutGrid size={17} color={dark ? ICON_COLORS.inkDark : ICON_COLORS.ink} />
    </Pressable>
  );

  // The page header stays pinned; everything else scrolls — in a scroll
  // area as wide as the screen (see `Screen`'s `header`), so the wheel works
  // over the side gutters too, not just over the content column.
  const pageHeader = editing ? (
    <EditToolbar
      onDone={editor.done}
      onCancel={editor.cancel}
      onReset={editor.reset}
      compact={!desktop}
      error={editor.saveError}
      onOpenAdd={() => setAddOpen(true)}
      addCount={editor.available.length}
    />
  ) : desktop ? (
    // Desktop: a page header — greeting on the left, month on the right —
    // ruled off from the widgets, which scroll under it on the same
    // background.
    <View className="flex-row items-end justify-between border-b border-line pb-5 dark:border-line-dark">
      <View className="gap-1">
        <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <Text className="text-3xl font-extrabold tracking-tight text-ink dark:text-ink-dark">
          Tu resumen
        </Text>
      </View>
      <View className="flex-row items-center gap-4">
        <MonthSwiper
          yearLabel={yearLabel}
          monthLabel={monthLabel}
          isCurrentMonth={isCurrentMonth}
          monthKey={selectedMonth}
          onShift={shiftMonth}
          onOpenPicker={() => setMonthPickerOpen(true)}
        />
      </View>
    </View>
  ) : (
    <View className="relative">
      <MonthSwiper
        yearLabel={yearLabel}
        monthLabel={monthLabel}
        isCurrentMonth={isCurrentMonth}
        monthKey={selectedMonth}
        onShift={shiftMonth}
        onOpenPicker={() => setMonthPickerOpen(true)}
      />
      <View className="absolute bottom-0 left-0 top-0 justify-center">{customizeButton}</View>
      {/* Pinned to the row's right edge so the month selector stays centered.
        Desktop has the notifications in the sidebar. */}
      {desktop ? null : (
        <View className="absolute bottom-0 right-0 top-0 justify-center">
          <NotificationBell />
        </View>
      )}
    </View>
  );

  return (
    <Screen
      edges={['top']}
      className="gap-5"
      width="wide"
      scroll
      header={pageHeader}
      scrollEnabled={!dragging}
    >
      <AddWidgetsSheet
        visible={editing && addOpen}
        onClose={() => setAddOpen(false)}
        available={editor.available}
        onAdd={editor.add}
      />
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
        <HomeSkeleton />
      ) : (
        <>
          <FixedInEdit editing={editing}>
            {kpisInline ? (
              // Desktop: the three headline numbers side by side.
              <View className="flex-row gap-5">
                <View style={{ flex: 1.3 }}>{balanceCard}</View>
                <View className="flex-1">{monthCards}</View>
              </View>
            ) : (
              <View className="gap-5">
                {balanceCard}
                {monthCards}
              </View>
            )}
          </FixedInEdit>

          {editing ? editGrid : grid}
        </>
      )}
    </Screen>
  );
}
