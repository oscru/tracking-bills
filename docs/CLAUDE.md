# Architecture Plan — Finance Tracker App

> This document is meant to be consumed by an AI agent (Claude Code, Cursor, etc.) as a kickoff guide for the project. It contains decisions that have already been made, so the agent doesn't need to re-ask, and it explicitly lists the open points.

## 0. Context and product decision

- Personal finance app (expense/income tracking) to replace Mobills.
- **This is a product**, not just personal use → design it multi-tenant and with monetization capability from day 1, even though the MVP won't charge yet.
- MVP = the essentials: transactions (income/expense), categories, accounts, dashboard with charts. No budgets/goals/debt tracking in v1 (these are added later; the data model already accounts for them so there's no migration needed down the line).
- Must work on **web and mobile from the start**, without duplicating the entire UI layer later on.

## 1. Stack decision: Expo (universal app)

Pure Next.js is ruled out. **Expo + Expo Router** is used as the universal base (web + iOS + Android from a single codebase), via `react-native-web`.

**Accepted trade-off:** losing Next.js's "native" SSR and easy SEO. This isn't critical because this app lives behind a login (it doesn't need to be indexed by Google); if a public SEO-friendly landing page is needed later, that landing can live separately (Next.js or Astro) outside the app's monorepo.

**Final stack:**

- **Expo SDK (latest stable) + Expo Router** — navigation and universal target
- **TypeScript** across the whole project
- **NativeWind** (Tailwind for React Native/web) — keeps the Tailwind-class workflow you already use
- **Supabase** — Postgres + Auth + Row Level Security (RLS) + Storage in case receipt attachments are needed later
- **TanStack Query** — data/cache management (better cross-platform support than RTK Query in this context)
- **Zustand** — lightweight global state (UI state, not server state)
- **Zod** — schema validation shared between forms and Supabase calls
- **Victory Native / Recharts** (Recharts on web, Victory Native on mobile) or evaluate **react-native-svg-charts** for universal charts — to be decided in the UI phase

## 2. Monorepo structure

Turborepo (or Nx if the agent prefers, but Turborepo is simpler for this scope).

```
finance-app/
├── apps/
│   └── mobile/              # Expo Router — runs on iOS, Android, and Web
├── packages/
│   ├── core/                 # Business logic, UI-agnostic
│   │   ├── supabase/         # client + queries + mutations
│   │   ├── hooks/             # TanStack Query hooks (useTransactions, useCategories...)
│   │   ├── types/             # types generated from Supabase + domain types
│   │   ├── validators/       # Zod schemas
│   │   └── utils/             # currency formatting, dates, calculations
│   ├── ui/                    # shared components (NativeWind), if applicable
│   └── config/                # shared eslint, tsconfig, tailwind config
├── supabase/
│   ├── migrations/            # versioned SQL
│   └── seed.sql
├── turbo.json
└── package.json
```

**Golden rule for the agent:** no business logic or Supabase calls inside `apps/mobile` components. Everything goes through `packages/core`. This is what guarantees that, down the line, things can be rearranged (e.g. pulling out a separate Next.js landing page) without rewriting logic.

## 3. Data model (Supabase / Postgres)

Designed multi-tenant from the start with RLS.

```sql
-- profiles (extends auth.users)
profiles (
  id uuid primary key references auth.users,
  email text,
  plan text default 'free',        -- 'free' | 'premium' (for future monetization)
  currency text default 'MXN',
  created_at timestamptz default now()
)

-- accounts (cash, bank, card)
accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  name text not null,
  type text not null,              -- 'cash' | 'bank' | 'credit_card'
  currency text default 'MXN',
  initial_balance numeric default 0,
  archived boolean default false,
  created_at timestamptz default now()
)

-- categories (system defaults + user-custom)
categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),  -- null = system default category
  name text not null,
  type text not null,              -- 'income' | 'expense'
  icon text,
  color text,
  is_default boolean default false,
  created_at timestamptz default now()
)

-- transactions
transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  account_id uuid references accounts(id),
  category_id uuid references categories(id),
  type text not null,              -- 'income' | 'expense'
  amount numeric not null,
  description text,
  transaction_date date not null,
  created_at timestamptz default now()
)

-- (v2, already accounted for in the design but not in the MVP)
-- budgets (limits per category/month)
-- debts (detailed debt/credit card tracking)
```

**RLS:** standard `user_id = auth.uid()` policy on all tables except `categories` with `is_default = true` (visible to everyone, read-only).

## 4. Development phases (suggested order for the agent)

1. **Monorepo setup** — Turborepo, Expo app, empty packages, shared TypeScript/ESLint config.
2. **Supabase** — project, SQL migrations for the 4 MVP tables, RLS policies, default categories seed.
3. **`packages/core`** — Supabase client, generated types (`supabase gen types typescript`), TanStack Query hooks for accounts/categories/transactions CRUD.
4. **Auth** — login/signup screens with Supabase Auth, route protection with Expo Router.
5. **Transactions CRUD** — form (income/expense), list, edit, delete.
6. **Accounts and categories** — management screens (simple CRUD).
7. **Dashboard** — overall balance, spending by category (donut/bar chart), monthly trend (line chart).
8. **Filters** — by date, account, category on the transaction list.
9. **UI/UX polish** — proper responsiveness on web vs mobile (breakpoints with NativeWind).
10. **(Post-MVP)** Budgets, debt/credit card tracking, CSV export, dark mode, advanced multi-currency, premium plan with paywall.

## 5. Open points to decide along the way (don't block kickoff)

- Final charting library (evaluate in phase 7 based on how it looks on web vs native).
- Whether to use Expo Application Services (EAS) for builds/distribution right away or decide later.
- Base currency is MXN, but the design already supports multi-currency per account — decide whether the MVP exposes that in the UI or keeps it fixed.
- Product name (currently "finance-app" as a repo placeholder).

---

**Instruction for the agent:** start with Phase 1 (monorepo setup) and Phase 2 (Supabase + migrations) in parallel, since they don't depend on each other. Confirm folder structure before generating code for Phase 3 onward.
