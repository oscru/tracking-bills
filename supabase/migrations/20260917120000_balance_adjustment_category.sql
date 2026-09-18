-- Default "Balance Adjustment" category, one per type — the account-balance
-- adjustment flow books its diff as a plain income/expense transaction and
-- needs a category of the matching type to tag it with.
--
-- Same upsert convention as 20260907120500_default_categories.sql.

insert into public.categories (slug, name, type, icon, color, is_default, sort_order)
values
  ('balance_adjustment_expense', 'Ajuste de saldo', 'expense', 'swap-vertical', '#64748b', true, 995),
  ('balance_adjustment_income',  'Ajuste de saldo', 'income',  'swap-vertical', '#64748b', true, 995)
on conflict (slug) where user_id is null
do update set
  name = excluded.name,
  type = excluded.type,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order,
  updated_at = now();
