-- Replace the account type set (cash/bank/credit_card) with the five
-- categories the UI now offers: investment, credit, debit, savings, loan.
-- The old constraint is dropped before remapping existing rows, since it
-- would otherwise reject the new values while the update is in flight.

alter table public.accounts drop constraint accounts_type_check;

update public.accounts set type = 'debit' where type in ('cash', 'bank');
update public.accounts set type = 'credit' where type = 'credit_card';

alter table public.accounts
  add constraint accounts_type_check
  check (type in ('investment', 'credit', 'debit', 'savings', 'loan'));

-- handle_new_user still created the starter account with type 'cash', which
-- the constraint above now rejects. Point it at 'debit' instead. Also seed a
-- starter set of categories to use as a guide — ordinary rows the user can
-- rename, recolor, or delete from day one, same as anything they create
-- themselves.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.accounts (user_id, name, type)
  values (new.id, 'Cash', 'debit');

  insert into public.categories (user_id, slug, name, type, icon, color, sort_order)
  values
    -- Expense
    (new.id, 'groceries',                 'Supermercado',         'expense', 'cart',                '#22c55e',  10),
    (new.id, 'dining_out',                'Restaurantes',         'expense', 'restaurant',          '#f97316',  20),
    (new.id, 'transport',                 'Transporte',           'expense', 'car',                 '#3b82f6',  30),
    (new.id, 'housing',                   'Vivienda',             'expense', 'home',                '#8b5cf6',  40),
    (new.id, 'utilities',                 'Servicios',            'expense', 'flash',               '#eab308',  50),
    (new.id, 'health',                    'Salud',                'expense', 'medkit',              '#ef4444',  60),
    (new.id, 'entertainment',             'Entretenimiento',      'expense', 'game-controller',     '#ec4899',  70),
    (new.id, 'shopping',                  'Compras',              'expense', 'bag-handle',          '#14b8a6',  80),
    (new.id, 'education',                 'Educación',            'expense', 'school',              '#0ea5e9',  90),
    (new.id, 'personal_care',             'Cuidado personal',     'expense', 'sparkles',            '#f472b6', 100),
    (new.id, 'travel',                    'Viajes',               'expense', 'airplane',            '#06b6d4', 110),
    (new.id, 'subscriptions',             'Suscripciones',        'expense', 'repeat',              '#a855f7', 120),
    (new.id, 'taxes',                     'Impuestos',            'expense', 'document-text',       '#64748b', 130),
    (new.id, 'fees',                      'Comisiones y cargos',  'expense', 'card',                '#78716c', 140),
    (new.id, 'gifts_donations',           'Regalos y donaciones', 'expense', 'gift',                '#fb7185', 150),
    (new.id, 'other_expense',             'Otro',                 'expense', 'ellipsis-horizontal', '#94a3b8', 999),
    (new.id, 'balance_adjustment_expense','Ajuste de saldo',      'expense', 'swap-vertical',       '#64748b', 995),
    -- Income
    (new.id, 'salary',                    'Salario',              'income',  'cash',                '#16a34a',  10),
    (new.id, 'freelance',                 'Freelance',            'income',  'briefcase',           '#2563eb',  20),
    (new.id, 'business',                  'Negocio',              'income',  'storefront',          '#7c3aed',  30),
    (new.id, 'investments',               'Inversiones',          'income',  'trending-up',         '#059669',  40),
    (new.id, 'interest',                  'Intereses',            'income',  'pie-chart',           '#0d9488',  50),
    (new.id, 'rental_income',             'Renta',                'income',  'key',                 '#ca8a04',  60),
    (new.id, 'gifts',                     'Regalos',              'income',  'gift',                '#db2777',  70),
    (new.id, 'refunds',                   'Reembolsos',           'income',  'return-down-back',    '#0891b2',  80),
    (new.id, 'other_income',              'Otro',                 'income',  'ellipsis-horizontal', '#94a3b8', 999),
    (new.id, 'balance_adjustment_income', 'Ajuste de saldo',      'income',  'swap-vertical',       '#64748b', 995);

  return new;
end;
$$;
