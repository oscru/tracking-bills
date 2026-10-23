/**
 * In-app notifications, derived — not stored.
 *
 * Every notification here is *computed* from data the app already syncs
 * (pending transactions, budgets, goals), so the same list shows up on every
 * device with no server job. The only thing persisted is which ones the user
 * has read or dismissed (`notification_reads`), keyed by each notification's
 * stable `id`.
 *
 * An `id` encodes exactly what the notification is *about*, including the
 * occurrence (budget period, overdue reminder round, goal milestone…), so:
 * - the same situation always produces the same id → read/dismissed sticks;
 * - a genuinely new occurrence gets a new id → it's unread again.
 *
 * Pure functions only (no React/Expo) — the phase-2 scheduler and a future
 * server push job reuse these same rules.
 */
import { i18n } from '../i18n/instance';
import { resolveCategoryLabel } from '../i18n';
import type { BudgetWithCategories, TransactionWithRefs } from '../supabase';
import type { Account, Goal } from '../types';
import { isKindEnabled, type NotificationPrefs } from './prefs';
import {
  addDaysISO,
  budgetProgress,
  daysUntil,
  formatCurrency,
  formatDate,
  goalPace,
  goalProgress,
  suggestedGoalContribution,
  todayISODate,
} from '../utils';

export type NotificationCategory = 'pending' | 'budget' | 'goal' | 'peer';

export type NotificationKind =
  | 'pending-today'
  | 'pending-tomorrow'
  | 'pending-overdue'
  | 'budget-threshold'
  | 'budget-exceeded'
  | 'goal-contribution-due'
  | 'goal-behind'
  | 'goal-milestone'
  | 'goal-completed'
  | 'peer-received';

export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'success';

/** Where tapping the notification should take you — the app maps it to a route. */
export type NotificationTarget =
  | { type: 'transaction'; id: string }
  | { type: 'budget'; id: string }
  | { type: 'goal'; id: string };

export interface AppNotification {
  /** Stable identity — see the module comment. */
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  /** `YYYY-MM-DD` the notification became relevant — sort key and "hace 2 días". */
  date: string;
  target: NotificationTarget;
}

export interface NotificationInput {
  transactions: TransactionWithRefs[];
  /** Recent transfers linked people sent you (mirrors in your ledger). Optional — omit for no "te envió" notifications. */
  received?: TransactionWithRefs[];
  budgets: BudgetWithCategories[];
  goals: Goal[];
  accounts: Account[];
}

export interface NotificationOptions {
  /** `YYYY-MM-DD` to evaluate as "today". Defaults to the device's date. */
  today?: string;
  /** Budget % (of its amount) that triggers the "casi llegas" warning. Default 80. */
  budgetThreshold?: number;
  /** An overdue pending movement is re-announced (as unread) every this many days. Default 3. */
  overdueRepeatDays?: number;
}

const DEFAULT_BUDGET_THRESHOLD = 80;
const DEFAULT_OVERDUE_REPEAT_DAYS = 3;
const GOAL_MILESTONES = [25, 50, 75] as const;
// Linear-pace goals (deadline, no planned contribution) only count as
// "behind" past this much shortfall, so a few days' slack doesn't nag.
const GOAL_BEHIND_TOLERANCE = 0.9;

/** A notification text in the current language (`notifications:items`). */
const tn = (key: string, options?: Record<string, unknown>): string =>
  (i18n.t as (key: string, options?: Record<string, unknown>) => string)(
    `notifications:items.${key}`,
    options,
  );

// --- pending movements ------------------------------------------------------

function pendingLabel(t: TransactionWithRefs): string {
  const description = t.description?.trim();
  if (description) return description;
  if (t.type === 'transfer') return tn('transfer');
  return t.category ? resolveCategoryLabel(t.category) : tn('movement');
}

function pendingAmount(t: TransactionWithRefs): string {
  const amount = formatCurrency(Number(t.amount), t.account?.currency ?? 'MXN');
  return t.account?.name ? `${amount} · ${t.account.name}` : amount;
}

function pendingNotifications(
  transactions: TransactionWithRefs[],
  today: string,
  overdueRepeatDays: number,
): AppNotification[] {
  const tomorrow = addDaysISO(today, 1);
  const out: AppNotification[] = [];

  for (const t of transactions) {
    if (t.is_completed) continue;
    // A pending transfer a linked person sent you is theirs to carry out —
    // nothing for you to do, so no reminders.
    if (t.is_peer_mirror) continue;
    const label = pendingLabel(t);
    const target: NotificationTarget = { type: 'transaction', id: t.id };

    if (t.transaction_date === today) {
      out.push({
        id: `pending-today:${t.id}:${t.transaction_date}`,
        kind: 'pending-today',
        category: 'pending',
        severity: 'warning',
        title: tn(`pendingToday.${t.type}`, { label }),
        body: pendingAmount(t),
        date: today,
        target,
      });
    } else if (t.transaction_date === tomorrow) {
      out.push({
        id: `pending-tomorrow:${t.id}:${t.transaction_date}`,
        kind: 'pending-tomorrow',
        category: 'pending',
        severity: 'info',
        title: tn(`pendingTomorrow.${t.type}`, { label }),
        body: pendingAmount(t),
        date: today,
        target,
      });
    } else if (t.transaction_date < today) {
      const daysLate = daysUntil(today, t.transaction_date);
      // One id per reminder round: dismissing it quiets it until the next
      // round, instead of either nagging daily or going silent forever.
      const round = Math.floor((daysLate - 1) / overdueRepeatDays);
      out.push({
        id: `pending-overdue:${t.id}:${t.transaction_date}:${round}`,
        kind: 'pending-overdue',
        category: 'pending',
        severity: 'critical',
        title: tn('overdueTitle', { label }),
        body: tn('overdueBody', {
          date: formatDate(t.transaction_date),
          count: daysLate,
          amount: pendingAmount(t),
        }),
        date: addDaysISO(t.transaction_date, 1 + round * overdueRepeatDays),
        target,
      });
    }
  }
  return out;
}

// --- linked people --------------------------------------------------------------

/** How long a received transfer stays in the notification center. */
const RECEIVED_WINDOW_DAYS = 7;

/** "Ana te envió $5,000" — for each settled transfer a linked person sent you recently. */
function peerNotifications(received: TransactionWithRefs[], today: string): AppNotification[] {
  const since = addDaysISO(today, -RECEIVED_WINDOW_DAYS);
  const out: AppNotification[] = [];
  for (const t of received) {
    if (!t.is_peer_mirror || !t.is_completed) continue;
    if (t.transaction_date > today || t.transaction_date < since) continue;
    const who = t.account?.name ?? tn('someone');
    const amount = formatCurrency(Number(t.amount), t.account?.currency ?? 'MXN');
    out.push({
      id: `peer-received:${t.id}`,
      kind: 'peer-received',
      category: 'peer',
      severity: 'success',
      title: tn('peerTitle', { who, amount }),
      body: t.to_account?.name
        ? tn('peerBodyAccount', { account: t.to_account.name })
        : tn('peerBody'),
      date: t.transaction_date,
      target: { type: 'transaction', id: t.id },
    });
  }
  return out;
}

// --- budgets ------------------------------------------------------------------

/** The date the budget's running spend first reached `limit` — when the notification "happened". */
function budgetCrossingDate(
  budget: BudgetWithCategories,
  transactions: TransactionWithRefs[],
  from: string,
  to: string,
  limit: number,
): string | null {
  const categoryIds = new Set(budget.categories.map((c) => c.category.id));
  const spends = transactions
    .filter(
      (t) =>
        t.is_completed &&
        t.type === 'expense' &&
        t.account?.currency === budget.currency &&
        t.category?.id != null &&
        categoryIds.has(t.category.id) &&
        t.transaction_date >= from &&
        t.transaction_date <= to,
    )
    .sort((a, b) => (a.transaction_date < b.transaction_date ? -1 : 1));
  let running = 0;
  for (const t of spends) {
    running += Number(t.amount);
    if (running >= limit) return t.transaction_date;
  }
  return null;
}

function budgetNotifications(
  budgets: BudgetWithCategories[],
  transactions: TransactionWithRefs[],
  today: string,
  threshold: number,
  referenceDate: Date,
): AppNotification[] {
  const out: AppNotification[] = [];

  for (const budget of budgets) {
    if (budget.archived || budget.categories.length === 0) continue;
    const amount = Number(budget.amount);
    if (amount <= 0) continue;

    const progress = budgetProgress(
      budget.categories.map((c) => c.category.id),
      amount,
      budget.currency,
      budget,
      transactions,
      referenceDate,
    );
    // Only the occurrence running now — a one-off budget that already ended
    // (or hasn't started) has nothing actionable to say.
    if (today < progress.from || today > progress.to) continue;

    const target: NotificationTarget = { type: 'budget', id: budget.id };
    const daysLeft = daysUntil(progress.to, today) + 1;
    const period = progress.from;

    if (progress.isOverBudget) {
      out.push({
        id: `budget-exceeded:${budget.id}:${period}`,
        kind: 'budget-exceeded',
        category: 'budget',
        severity: 'critical',
        title: tn('budgetExceededTitle', { name: budget.name }),
        body: tn('budgetExceededBody', {
          spent: formatCurrency(progress.spent, budget.currency),
          limit: formatCurrency(amount, budget.currency),
          over: formatCurrency(-progress.remaining, budget.currency),
          end: formatDate(progress.to),
        }),
        date:
          budgetCrossingDate(budget, transactions, progress.from, progress.to, amount + 0.005) ??
          today,
        target,
      });
    } else if (progress.pct >= threshold) {
      out.push({
        id: `budget-threshold:${budget.id}:${period}:${threshold}`,
        kind: 'budget-threshold',
        category: 'budget',
        severity: 'warning',
        title: tn('budgetThresholdTitle', { pct: Math.floor(progress.pct), name: budget.name }),
        body: tn('budgetThresholdBody', {
          remaining: formatCurrency(progress.remaining, budget.currency),
          count: daysLeft,
        }),
        date:
          budgetCrossingDate(
            budget,
            transactions,
            progress.from,
            progress.to,
            (amount * threshold) / 100,
          ) ?? today,
        target,
      });
    }
  }
  return out;
}

// --- goals ----------------------------------------------------------------------

/** The latest settled contribution date for a goal (virtual or account-linked), if any. */
function lastContributionDate(goal: Goal, transactions: TransactionWithRefs[]): string | null {
  let latest: string | null = null;
  for (const t of transactions) {
    if (!t.is_completed) continue;
    const contributes = goal.account_id
      ? (t.type === 'transfer' && t.to_account_id === goal.account_id) ||
        (t.type === 'income' && t.account_id === goal.account_id)
      : t.goal_id === goal.id;
    if (contributes && (latest == null || t.transaction_date > latest)) latest = t.transaction_date;
  }
  return latest;
}

function goalNotifications(
  goals: Goal[],
  accounts: Account[],
  transactions: TransactionWithRefs[],
  today: string,
): AppNotification[] {
  const out: AppNotification[] = [];

  for (const goal of goals) {
    if (goal.archived) continue;
    const target: NotificationTarget = { type: 'goal', id: goal.id };
    const linkedAccount = goal.account_id
      ? (accounts.find((a) => a.id === goal.account_id) ?? null)
      : null;
    const progress = goalProgress(
      goal.id,
      Number(goal.target_amount),
      goal.currency,
      transactions,
      linkedAccount,
    );
    const lastContribution = lastContributionDate(goal, transactions);
    const createdOn = goal.created_at.slice(0, 10);
    const money = (n: number) => formatCurrency(n, goal.currency);

    if (progress.isComplete) {
      out.push({
        id: `goal-completed:${goal.id}`,
        kind: 'goal-completed',
        category: 'goal',
        severity: 'success',
        title: tn('goalCompletedTitle', { name: goal.name }),
        body: tn('goalCompletedBody', {
          saved: money(progress.saved),
          target: money(Number(goal.target_amount)),
        }),
        date: lastContribution ?? today,
        target,
      });
      continue;
    }
    if (goal.is_completed) continue;

    const milestone = [...GOAL_MILESTONES].reverse().find((m) => progress.pct >= m);
    if (milestone != null) {
      out.push({
        id: `goal-milestone:${goal.id}:${milestone}`,
        kind: 'goal-milestone',
        category: 'goal',
        severity: 'success',
        title: tn('goalMilestoneTitle', { pct: milestone, name: goal.name }),
        body: tn('goalMilestoneBody', {
          saved: money(progress.saved),
          remaining: money(progress.remaining),
        }),
        date: lastContribution ?? today,
        target,
      });
    }

    const contribution = goal.contribution_amount != null ? Number(goal.contribution_amount) : null;
    const interval = goal.contribution_interval_days;

    // Planned contribution: the most recent due date since creation, if
    // nothing has been put in since it came due.
    if (contribution && interval && interval > 0) {
      const elapsed = daysUntil(today, createdOn);
      const periods = Math.floor(elapsed / interval);
      if (periods >= 1) {
        const lastDue = addDaysISO(createdOn, periods * interval);
        if (lastContribution == null || lastContribution < lastDue) {
          out.push({
            id: `goal-contribution:${goal.id}:${lastDue}`,
            kind: 'goal-contribution-due',
            category: 'goal',
            severity: 'info',
            title: tn('goalDueTitle', { name: goal.name }),
            body: tn('goalDueBody', { amount: money(contribution), days: interval }),
            date: lastDue,
            target,
          });
        }
      }
    }

    // Behind schedule — re-announced at most once a month.
    if (goal.deadline) {
      const month = today.slice(0, 7);
      let behind = false;
      if (contribution && interval && interval > 0) {
        behind =
          goalPace(progress.saved, contribution, interval, goal.created_at, today).status ===
          'behind';
      } else {
        const total = daysUntil(goal.deadline, createdOn);
        const elapsed = daysUntil(today, createdOn);
        if (total > 0) {
          const expected = Number(goal.target_amount) * Math.min(1, elapsed / total);
          behind = progress.saved < expected * GOAL_BEHIND_TOLERANCE;
        }
      }
      const pastDeadline = goal.deadline < today;
      if (behind || pastDeadline) {
        const suggestion = pastDeadline
          ? null
          : suggestedGoalContribution(progress.remaining, goal.deadline, 30, new Date());
        out.push({
          id: `goal-behind:${goal.id}:${month}`,
          kind: 'goal-behind',
          category: 'goal',
          severity: 'warning',
          title: tn(pastDeadline ? 'goalLateTitle' : 'goalBehindTitle', { name: goal.name }),
          body: pastDeadline
            ? tn('goalLateBody', {
                date: formatDate(goal.deadline),
                remaining: money(progress.remaining),
              })
            : tn('goalBehindBody', {
                date: formatDate(goal.deadline),
                amount: money(suggestion ?? progress.remaining),
              }),
          date: `${month}-01` > createdOn ? `${month}-01` : createdOn,
          target,
        });
      }
    }
  }
  return out;
}

// --- entry point ---------------------------------------------------------------------

const SEVERITY_RANK: Record<NotificationSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
};

/**
 * Every notification that applies right now, newest first (ties: most
 * urgent first). Deterministic for a given input + `today`.
 */
export function buildNotifications(
  input: NotificationInput,
  options: NotificationOptions = {},
): AppNotification[] {
  const today = options.today ?? todayISODate();
  const [y, m, d] = today.split('-').map(Number);
  const referenceDate = new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1);

  const all = [
    ...pendingNotifications(
      input.transactions,
      today,
      options.overdueRepeatDays ?? DEFAULT_OVERDUE_REPEAT_DAYS,
    ),
    ...budgetNotifications(
      input.budgets,
      input.transactions,
      today,
      options.budgetThreshold ?? DEFAULT_BUDGET_THRESHOLD,
      referenceDate,
    ),
    ...goalNotifications(input.goals, input.accounts, input.transactions, today),
    ...peerNotifications(input.received ?? [], today),
  ];

  return all.sort((a, b) =>
    a.date !== b.date
      ? a.date < b.date
        ? 1
        : -1
      : SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
}

// --- device scheduling (phase 2) ------------------------------------------------------

export * from './prefs';

/** Kinds tied to a calendar date — scheduled ahead of time, at the reminder hour. */
export const SCHEDULED_KINDS: ReadonlySet<NotificationKind> = new Set<NotificationKind>([
  'pending-today',
  'pending-tomorrow',
  'pending-overdue',
  'goal-contribution-due',
  'goal-behind',
]);

/** Kinds caused by a change in the data (a spend, a contribution) — announced right away. */
export const EVENT_KINDS: ReadonlySet<NotificationKind> = new Set<NotificationKind>([
  'budget-threshold',
  'budget-exceeded',
  'goal-milestone',
  'goal-completed',
  'peer-received',
]);

// The in-app center keeps an overdue movement visible until it's resolved,
// but the phone only nags this many times (day after, +3, +6) — past that,
// more pings are noise.
const MAX_OVERDUE_DEVICE_ROUNDS = 3;

/** The reminder round encoded in a `pending-overdue` id (its last segment). */
function overdueRound(n: AppNotification): number {
  return Number(n.id.slice(n.id.lastIndexOf(':') + 1)) || 0;
}

export interface ScheduledNotification extends AppNotification {
  /** When the device should show it. */
  fireAt: Date;
}

export interface ScheduleOptions {
  now?: Date;
  /** How many days ahead to plan. Re-planned every time the data changes, so this only needs to cover a gap between app opens. */
  horizonDays?: number;
  /** Cap on how many get scheduled (iOS keeps at most 64 pending local notifications per app). */
  limit?: number;
  /** Ids already read/dismissed in the in-app center — never sent. */
  excludeIds?: ReadonlySet<string>;
}

/**
 * The date-based notifications to schedule on the device: for each of the
 * next `horizonDays` days, the same rules as the in-app center are run "as
 * of" that day, and whatever *starts* that day (its `date`) is scheduled at
 * `prefs.reminderHour`. Assumes nothing changes in between — when something
 * does (a payment marked done, a contribution), the app simply re-plans.
 */
export function planScheduledNotifications(
  input: NotificationInput,
  prefs: NotificationPrefs,
  options: ScheduleOptions = {},
): ScheduledNotification[] {
  if (!prefs.enabled) return [];
  const now = options.now ?? new Date();
  const horizon = options.horizonDays ?? 30;
  const exclude = options.excludeIds ?? new Set<string>();
  const today = todayISODate(now);

  // Only these inputs can produce date-based notifications.
  const pending = input.transactions.filter((t) => !t.is_completed);
  const plannedGoals = input.goals.filter(
    (g) =>
      !g.archived &&
      (g.deadline != null ||
        (g.contribution_amount != null && g.contribution_interval_days != null)),
  );

  const planned = new Map<string, ScheduledNotification>();
  for (let offset = 0; offset <= horizon; offset++) {
    const day = addDaysISO(today, offset);
    const [y, m, d] = day.split('-').map(Number);
    const fireAt = new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1, prefs.reminderHour, 0, 0);
    if (fireAt <= now) continue;

    const candidates = [
      ...pendingNotifications(pending, day, DEFAULT_OVERDUE_REPEAT_DAYS),
      ...goalNotifications(plannedGoals, input.accounts, input.transactions, day),
    ];
    for (const n of candidates) {
      if (n.date !== day || !SCHEDULED_KINDS.has(n.kind)) continue;
      if (n.kind === 'pending-overdue' && overdueRound(n) >= MAX_OVERDUE_DEVICE_ROUNDS) continue;
      if (!isKindEnabled(prefs, n.kind) || exclude.has(n.id) || planned.has(n.id)) continue;
      planned.set(n.id, { ...n, fireAt });
    }
  }

  return [...planned.values()]
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, options.limit ?? 60);
}

/** The event-driven notifications (from a `buildNotifications` result) the user wants announced on the device. */
export function eventNotifications(
  current: AppNotification[],
  prefs: NotificationPrefs,
): AppNotification[] {
  return current.filter((n) => EVENT_KINDS.has(n.kind) && isKindEnabled(prefs, n.kind));
}
