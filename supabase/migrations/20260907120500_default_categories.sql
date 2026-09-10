-- Seed the system default categories.
--
-- These are reference data that must exist in every environment, so they live in
-- a migration (not seed.sql, which is local-dev only). Re-runnable: matched on
-- `slug`, values refreshed on conflict.
--
-- `name` is the English fallback. Localized labels come from the client via the
-- translation key `categories.<slug>` (see 20260907120300_categories.sql).

insert into public.categories (slug, name, type, icon, color, is_default, sort_order)
values
  -- Expense
  ('groceries',        'Groceries',          'expense', 'cart',                '#22c55e', true,  10),
  ('dining_out',       'Dining Out',         'expense', 'restaurant',          '#f97316', true,  20),
  ('transport',        'Transport',          'expense', 'car',                 '#3b82f6', true,  30),
  ('housing',          'Housing',            'expense', 'home',                '#8b5cf6', true,  40),
  ('utilities',        'Utilities',          'expense', 'flash',               '#eab308', true,  50),
  ('health',           'Health',             'expense', 'medkit',              '#ef4444', true,  60),
  ('entertainment',    'Entertainment',      'expense', 'game-controller',     '#ec4899', true,  70),
  ('shopping',         'Shopping',           'expense', 'bag-handle',          '#14b8a6', true,  80),
  ('education',        'Education',           'expense', 'school',              '#0ea5e9', true,  90),
  ('personal_care',    'Personal Care',      'expense', 'sparkles',            '#f472b6', true, 100),
  ('travel',           'Travel',             'expense', 'airplane',            '#06b6d4', true, 110),
  ('subscriptions',    'Subscriptions',      'expense', 'repeat',              '#a855f7', true, 120),
  ('taxes',            'Taxes',              'expense', 'document-text',       '#64748b', true, 130),
  ('fees',             'Fees & Charges',     'expense', 'card',                '#78716c', true, 140),
  ('gifts_donations',  'Gifts & Donations',  'expense', 'gift',                '#fb7185', true, 150),
  ('other_expense',    'Other',              'expense', 'ellipsis-horizontal', '#94a3b8', true, 999),
  -- Income
  ('salary',           'Salary',             'income',  'cash',                '#16a34a', true,  10),
  ('freelance',        'Freelance',          'income',  'briefcase',           '#2563eb', true,  20),
  ('business',         'Business',           'income',  'storefront',          '#7c3aed', true,  30),
  ('investments',      'Investments',        'income',  'trending-up',         '#059669', true,  40),
  ('interest',         'Interest',           'income',  'pie-chart',           '#0d9488', true,  50),
  ('rental_income',    'Rental Income',      'income',  'key',                 '#ca8a04', true,  60),
  ('gifts',            'Gifts',              'income',  'gift',                '#db2777', true,  70),
  ('refunds',          'Refunds',            'income',  'return-down-back',    '#0891b2', true,  80),
  ('other_income',     'Other',              'income',  'ellipsis-horizontal', '#94a3b8', true, 999)
on conflict (slug) where user_id is null
do update set
  name = excluded.name,
  type = excluded.type,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order,
  updated_at = now();
