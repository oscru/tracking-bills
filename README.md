# Finance Tracker

Universal (web + iOS + Android) personal finance app. See
[`docs/CLAUDE.md`](docs/CLAUDE.md) for the architecture plan and phased roadmap.

## Stack

Expo Router · TypeScript · NativeWind · Supabase · TanStack Query · Zustand · Zod,
in a Turborepo + pnpm monorepo.

## Layout

```
apps/
  mobile/        Expo Router app (iOS, Android, Web)
packages/
  core/          UI-agnostic business logic (supabase, hooks, types, validators, utils)
  ui/            Shared NativeWind components
  config/        Shared tsconfig / ESLint / Tailwind preset
supabase/
  migrations/    Versioned SQL
  seed.sql
```

**Golden rule:** no business logic or Supabase calls inside `apps/mobile`
components — everything goes through `packages/core`.

## Getting started

```bash
pnpm install
pnpm --filter mobile dev      # start the Expo dev server
pnpm --filter mobile web      # run in the browser
pnpm typecheck                # typecheck every workspace
pnpm lint
```

Node 22+ and pnpm 10+ required.

## Local database (Supabase)

The local Supabase stack runs in containers. Either Docker or Podman works; the
`scripts/supabase.sh` wrapper auto-points the CLI at the Podman socket when
`DOCKER_HOST` is unset.

```bash
pnpm db:start        # start Postgres + Auth + Studio (applies migrations + seed)
pnpm db:status       # print local URLs and keys
pnpm db:reset        # wipe + re-run all migrations and seed.sql
pnpm db:gen-types    # regenerate packages/core/src/types/database.ts
pnpm db:stop
```

Put the values from `db:status` into `apps/mobile/.env.local` (use the new-format
`sb_publishable_...` key, not the legacy JWT anon key):

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from db:status>
```

`apps/mobile/.env.example` has ready-to-copy blocks for the local stack and a
hosted project.

### Schema notes

- 4 MVP tables — `profiles`, `accounts`, `categories`, `transactions` — all with
  RLS scoped to `auth.uid()`. A trigger provisions a `profiles` row on signup.
- **Default categories are translatable.** System defaults carry a stable `slug`
  (`groceries`, `salary`, …); the client renders `t('categories.<slug>')` and
  falls back to the English `name`. User-custom categories have `slug = NULL` and
  their `name` is shown verbatim. See `resolveCategoryLabel` in `@repo/core/i18n`.

## Roadmap

Phased plan in [`docs/CLAUDE.md`](docs/CLAUDE.md).

- **Phase 1** — monorepo setup: Turborepo, Expo app, shared config. ✅
- **Phase 2** — Supabase: migrations for the 4 MVP tables, RLS, default
  categories seed. ✅
- **Phase 3** — `@repo/core` data layer: shared Supabase client, typed
  query/mutation functions (Zod-validated), TanStack Query hooks for
  accounts / categories / transactions CRUD. ✅
- **Phase 4** — auth: email/password sign-in / sign-up, `SessionProvider`,
  `(auth)` / `(app)` route groups with an `AuthGate`, shared `Button` /
  `TextField` / `Screen` in `@repo/ui`. ✅
- **Phase 5** — transactions CRUD: list (`(app)/index`), create / edit / delete
  via a shared `TransactionForm`, starter “Cash” account per user. ✅

### Using the data layer

```ts
import { useTransactions, useCreateTransaction } from '@repo/core/hooks';

const { data } = useTransactions({ type: 'expense', from: '2026-09-01' });
const create = useCreateTransaction();
create.mutate({ account_id, category_id, type: 'expense', amount: 12.5 });
```

Query/mutation functions live in `@repo/core/supabase`; hooks wrap them and own
cache invalidation. The web target is a client-only SPA (`web.output: "single"`).
