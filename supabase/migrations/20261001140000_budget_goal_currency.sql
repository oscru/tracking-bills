-- Budgets and goals were a bare number with no currency of their own —
-- implicitly assuming every account was in the same currency, which is no
-- longer true. Each one now locks a currency at creation (same convention
-- as `accounts.currency`), and its progress only counts transactions from
-- accounts in that same currency (enforced client-side in
-- `budgetProgress`/`goalProgress`, same as every other cross-row business
-- rule in this schema).

alter table public.budgets
  add column currency text not null default 'MXN' check (char_length(currency) = 3);

alter table public.goals
  add column currency text not null default 'MXN' check (char_length(currency) = 3);

comment on column public.budgets.currency is 'ISO 4217 code, locked at creation. Only same-currency expenses count toward this budget''s progress.';
comment on column public.goals.currency is 'ISO 4217 code, locked at creation. Only same-currency transfers count as contributions toward this goal.';
