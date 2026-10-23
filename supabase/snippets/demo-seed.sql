-- Demo data for screenshots (the landing's app screens) — LOCAL STACK ONLY.
--
-- Creates three linked users with ~3 months of believable activity in MXN and
-- USD, dated relative to today, so re-running it any time gives a fresh,
-- current-looking ledger:
--
--   mariana@demo.genobills.test   Mariana López — the one you sign in as
--   diego@demo.genobills.test     Diego Ramírez — her roomie (they split bills)
--   sofia@demo.genobills.test     Sofía Herrera — a friend (pesos and dólares)
--   luis@demo.genobills.test      Luis Ortega — a coworker (lunches, a gift pool)
--
-- Password for all three: demo-genobills-2026 (test-only, local stack).
--
-- Re-runnable: deletes the three demo users (and everything of theirs) first.
-- Run it with:
--   podman exec -i supabase_db_bills-tracker-app psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/snippets/demo-seed.sql

begin;

-- ---------------------------------------------------------------- cleanup
select set_config('app.deleting_own_account', 'true', true);
delete from public.transactions
  where user_id in (select id from auth.users where email like '%@demo.genobills.test');
delete from auth.users where email like '%@demo.genobills.test';
select set_config('app.deleting_own_account', 'false', true);

-- ---------------------------------------------------------------- helpers
-- Run the next statements as `p_user` (for functions that read auth.uid()).
create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.mk_user(p_email text, p_name text) returns uuid language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('demo-genobills-2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_name, 'legal_version', '2026-10-22'),
    now() - interval '100 days', now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_id,
    jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
    'email', v_id::text, now(), now(), now()
  );
  update public.profiles
    set has_seen_tour = true, enabled_currencies = array['MXN', 'USD'], theme_preference = 'light'
    where id = v_id;
  return v_id;
end;
$$;

create function pg_temp.acct(p_user uuid, p_name text) returns uuid language sql as $$
  select id from public.accounts where user_id = p_user and name = p_name and type <> 'contact';
$$;

create function pg_temp.cat(p_user uuid, p_name text) returns uuid language sql as $$
  select id from public.categories where user_id = p_user and name = p_name;
$$;

-- An income/expense dated `p_date`; later than today means scheduled (pending).
create function pg_temp.tx(
  p_user uuid, p_type text, p_account text, p_category text, p_amount numeric,
  p_date date, p_description text
) returns uuid language sql as $$
  insert into public.transactions
    (user_id, type, account_id, category_id, amount, transaction_date, description, is_completed,
     created_at)
  values (
    p_user, p_type, pg_temp.acct(p_user, p_account), pg_temp.cat(p_user, p_category), p_amount,
    p_date, p_description, p_date <= current_date, p_date + time '12:00'
  )
  returning id;
$$;

-- A transfer to one of the user's own accounts, a goal, or a linked person.
-- Only up to today: nobody schedules these ahead.
create function pg_temp.transfer(
  p_user uuid, p_from text, p_amount numeric, p_date date, p_description text,
  p_to_account uuid default null, p_goal uuid default null
) returns void language sql as $$
  insert into public.transactions
    (user_id, type, account_id, to_account_id, goal_id, amount, transaction_date, description,
     created_at)
  select
    p_user, 'transfer', pg_temp.acct(p_user, p_from), p_to_account, p_goal, p_amount, p_date,
    p_description, p_date + time '12:00'
  where p_date <= current_date;
$$;

-- The day `p_day` of the month `p_months_ago` months back (clamped to its last day).
create function pg_temp.month_day(p_months_ago int, p_day int) returns date language sql as $$
  select least(
    (date_trunc('month', current_date) - make_interval(months => p_months_ago))::date + (p_day - 1),
    (date_trunc('month', current_date) - make_interval(months => p_months_ago - 1))::date - 1
  );
$$;

do $$
declare
  v_mariana uuid := pg_temp.mk_user('mariana@demo.genobills.test', 'Mariana López');
  v_diego uuid := pg_temp.mk_user('diego@demo.genobills.test', 'Diego Ramírez');
  v_sofia uuid := pg_temp.mk_user('sofia@demo.genobills.test', 'Sofía Herrera');
  v_luis uuid := pg_temp.mk_user('luis@demo.genobills.test', 'Luis Ortega');
  v_start timestamptz := now() - interval '100 days';
  v_goal uuid;
  v_fund uuid;
  v_budget uuid;
  v_month int;
  v_date date;
  r record;
begin
  -- ------------------------------------------------------------ accounts
  insert into public.accounts (user_id, name, type, currency, initial_balance, color, created_at) values
    (v_mariana, 'BBVA Débito', 'debit', 'MXN', 14200, '#1d4ed8', v_start),
    (v_mariana, 'Nu Ahorro', 'savings', 'MXN', 21500, '#7c3aed', v_start),
    (v_mariana, 'Efectivo', 'cash', 'MXN', 1800, '#16a34a', v_start),
    (v_mariana, 'Amex', 'credit_card', 'MXN', 0, '#0f766e', v_start),
    (v_mariana, 'Wise', 'debit', 'USD', 420, '#65a30d', v_start),
    (v_diego, 'Santander', 'debit', 'MXN', 9000, null, v_start),
    (v_sofia, 'Banorte', 'debit', 'MXN', 12000, null, v_start),
    (v_sofia, 'Dólares', 'debit', 'USD', 600, null, v_start),
    (v_luis, 'HSBC', 'debit', 'MXN', 8000, null, v_start);

  -- ------------------------------------------------------------ categories
  insert into public.categories (user_id, name, type, icon, color, sort_order) values
    (v_mariana, 'Comida', 'expense', 'fast-food-outline', '#f97316', 1),
    (v_mariana, 'Transporte', 'expense', 'car-outline', '#0ea5e9', 2),
    (v_mariana, 'Hogar', 'expense', 'home-outline', '#8b5cf6', 3),
    (v_mariana, 'Salidas', 'expense', 'beer-outline', '#eab308', 4),
    (v_mariana, 'Suscripciones', 'expense', 'film-outline', '#ec4899', 5),
    (v_mariana, 'Salud', 'expense', 'medkit-outline', '#10b981', 6),
    (v_mariana, 'Mascotas', 'expense', 'paw-outline', '#a16207', 7),
    (v_mariana, 'Compras', 'expense', 'bag-handle-outline', '#6366f1', 8),
    (v_mariana, 'Sueldo', 'income', 'briefcase-outline', '#22c55e', 1),
    (v_mariana, 'Freelance', 'income', 'laptop-outline', '#14b8a6', 2);
  insert into public.categories (user_id, name, type, icon, color, parent_id, sort_order)
  select v_mariana, s.name, 'expense', s.icon, s.color, pg_temp.cat(v_mariana, s.parent), s.ord
  from (values
    ('Súper', 'cart-outline', '#f97316', 'Comida', 1),
    ('Restaurantes', 'restaurant-outline', '#ef4444', 'Comida', 2),
    ('Café', 'cafe-outline', '#b45309', 'Comida', 3),
    ('Uber y DiDi', 'car-sport-outline', '#0ea5e9', 'Transporte', 1),
    ('Gasolina', 'speedometer-outline', '#0369a1', 'Transporte', 2),
    ('Internet', 'globe-outline', '#a78bfa', 'Hogar', 1),
    ('Luz', 'flash-outline', '#facc15', 'Hogar', 2),
    ('Renta', 'key-outline', '#8b5cf6', 'Hogar', 3),
    ('Farmacia', 'bandage-outline', '#10b981', 'Salud', 1)
  ) as s(name, icon, color, parent, ord);

  -- ------------------------------------------------------------ people
  -- Mariana invited both; each one receives into their main account.
  insert into public.peer_links (inviter_id, invitee_id, code, status, accepted_at, created_at) values
    (v_mariana, v_diego, 'DEMO2D', 'accepted', v_start, v_start),
    (v_mariana, v_sofia, 'DEMO3S', 'accepted', v_start, v_start),
    (v_luis, v_mariana, 'DEMO4L', 'accepted', v_start, v_start);
  perform pg_temp.act_as(v_mariana);
  perform public.set_peer_receive_account(v_diego, pg_temp.acct(v_mariana, 'BBVA Débito'));
  perform public.set_peer_receive_account(v_sofia, pg_temp.acct(v_mariana, 'BBVA Débito'));
  perform public.set_peer_receive_account(v_sofia, pg_temp.acct(v_mariana, 'Wise'));
  perform public.set_peer_receive_account(v_luis, pg_temp.acct(v_mariana, 'BBVA Débito'));
  perform pg_temp.act_as(v_diego);
  perform public.set_peer_receive_account(v_mariana, pg_temp.acct(v_diego, 'Santander'));
  perform pg_temp.act_as(v_sofia);
  perform public.set_peer_receive_account(v_mariana, pg_temp.acct(v_sofia, 'Banorte'));
  perform public.set_peer_receive_account(v_mariana, pg_temp.acct(v_sofia, 'Dólares'));
  perform pg_temp.act_as(v_luis);
  perform public.set_peer_receive_account(v_mariana, pg_temp.acct(v_luis, 'HSBC'));
  perform set_config('request.jwt.claims', '', true);

  -- ------------------------------------------------------------ goals
  insert into public.goals (user_id, name, icon, target_amount, deadline, contribution_amount, contribution_interval_days, created_at)
  values (v_mariana, 'Viaje a Oaxaca', 'airplane-outline', 20000, current_date + 53, 1900, 15, v_start)
  returning id into v_goal;
  insert into public.goals (user_id, name, icon, target_amount, created_at)
  values (v_mariana, 'Fondo de emergencia', 'shield-checkmark-outline', 60000, v_start)
  returning id into v_fund;

  -- ------------------------------------------------------------ the months
  for v_month in reverse 3..0 loop
    -- Income: pay on the 15th and the last day; a freelance job most months.
    perform pg_temp.tx(v_mariana, 'income', 'BBVA Débito', 'Sueldo', 13500, pg_temp.month_day(v_month, 15), 'Quincena');
    perform pg_temp.tx(v_mariana, 'income', 'BBVA Débito', 'Sueldo', 13500, pg_temp.month_day(v_month, 31), 'Quincena');
    if v_month in (0, 2) then
      perform pg_temp.tx(v_mariana, 'income', 'BBVA Débito', 'Freelance', 4200 - v_month * 200,
        pg_temp.month_day(v_month, case when v_month = 0 then 6 else 22 end), 'Diseño de logo');
    end if;

    -- Fixed costs.
    perform pg_temp.tx(v_mariana, 'expense', 'BBVA Débito', 'Renta', 4500, pg_temp.month_day(v_month, 1), 'Mi mitad de la renta');
    perform pg_temp.tx(v_mariana, 'expense', 'BBVA Débito', 'Internet', 499, pg_temp.month_day(v_month, 5), 'Telmex');
    perform pg_temp.tx(v_mariana, 'expense', 'Amex', 'Suscripciones', 49, pg_temp.month_day(v_month, 3), 'iCloud');
    perform pg_temp.tx(v_mariana, 'expense', 'Amex', 'Suscripciones', 129, pg_temp.month_day(v_month, 8), 'Spotify');
    perform pg_temp.tx(v_mariana, 'expense', 'Amex', 'Suscripciones', 249, pg_temp.month_day(v_month, 18), 'Netflix');
    perform pg_temp.tx(v_mariana, 'expense', 'BBVA Débito', 'Mascotas', 680, pg_temp.month_day(v_month, 10), 'Croquetas Luna');
    if v_month % 2 = 0 then
      perform pg_temp.tx(v_mariana, 'expense', 'BBVA Débito', 'Luz', 486, pg_temp.month_day(v_month, 28), 'CFE bimestral');
    end if;

    -- Splitting the house with Diego: she covers the groceries run, he the gas.
    perform pg_temp.transfer(v_mariana, 'BBVA Débito', 380 + v_month * 85, pg_temp.month_day(v_month, 9), 'Mitad del súper',
      p_to_account => public.ensure_contact_account(v_mariana, v_diego, 'MXN'));
    perform pg_temp.transfer(v_diego, 'Santander', 420, pg_temp.month_day(v_month, 12), 'Mitad del gas y agua',
      p_to_account => public.ensure_contact_account(v_diego, v_mariana, 'MXN'));

    -- Cash, the card payment and savings.
    perform pg_temp.transfer(v_mariana, 'BBVA Débito', 1000, pg_temp.month_day(v_month, 2), 'Cajero',
      p_to_account => pg_temp.acct(v_mariana, 'Efectivo'));
    perform pg_temp.transfer(v_mariana, 'BBVA Débito', case when v_month = 0 then 2600 else 5000 end, pg_temp.month_day(v_month, 20), 'Pago Amex',
      p_to_account => pg_temp.acct(v_mariana, 'Amex'));
    perform pg_temp.transfer(v_mariana, 'BBVA Débito', 1900, pg_temp.month_day(v_month, 15), 'Para Oaxaca', p_goal => v_goal);
    if v_month > 0 then
      perform pg_temp.transfer(v_mariana, 'BBVA Débito', 2300 + v_month * 100, pg_temp.month_day(v_month, 30), 'Para Oaxaca', p_goal => v_goal);
      perform pg_temp.transfer(v_mariana, 'BBVA Débito', 2000, pg_temp.month_day(v_month, 16), 'Apartado', p_goal => v_fund);
    end if;
  end loop;

  -- One-offs.
  perform pg_temp.tx(v_mariana, 'expense', 'Amex', 'Salud', 900, current_date - 41, 'Limpieza dental');
  perform pg_temp.tx(v_mariana, 'expense', 'Efectivo', 'Mascotas', 450, current_date - 26, 'Vacuna de Luna');
  perform pg_temp.tx(v_mariana, 'expense', 'Wise', 'Compras', 34.99, current_date - 47, 'Audífonos');
  perform pg_temp.tx(v_mariana, 'expense', 'Wise', 'Suscripciones', 10, current_date - 71, 'ChatGPT');

  -- With Sofía, in pesos and dólares.
  perform pg_temp.transfer(v_sofia, 'Banorte', 560, current_date - 52, 'Cena de cumple',
    p_to_account => public.ensure_contact_account(v_sofia, v_mariana, 'MXN'));
  perform pg_temp.transfer(v_mariana, 'Wise', 40, current_date - 38, 'Boleto concierto',
    p_to_account => public.ensure_contact_account(v_mariana, v_sofia, 'USD'));
  perform pg_temp.transfer(v_sofia, 'Dólares', 15, current_date - 30, 'Mitad del Airbnb',
    p_to_account => public.ensure_contact_account(v_sofia, v_mariana, 'USD'));
  perform pg_temp.transfer(v_mariana, 'BBVA Débito', 380, current_date - 13, 'Mitad del Uber al aeropuerto',
    p_to_account => public.ensure_contact_account(v_mariana, v_sofia, 'MXN'));
  perform pg_temp.transfer(v_sofia, 'Banorte', 245, current_date - 4, 'Tacos del viernes',
    p_to_account => public.ensure_contact_account(v_sofia, v_mariana, 'MXN'));

  -- With Luis, from work.
  perform pg_temp.transfer(v_mariana, 'BBVA Débito', 300, current_date - 44, 'Regalo de Ceci (cooperacha)',
    p_to_account => public.ensure_contact_account(v_mariana, v_luis, 'MXN'));
  perform pg_temp.transfer(v_luis, 'HSBC', 185, current_date - 16, 'Comida en la fonda',
    p_to_account => public.ensure_contact_account(v_luis, v_mariana, 'MXN'));
  perform pg_temp.transfer(v_mariana, 'BBVA Débito', 185, current_date - 2, 'Comida en la fonda',
    p_to_account => public.ensure_contact_account(v_mariana, v_luis, 'MXN'));

  -- This week: enough coffee and rides that the budgets have something to say.
  perform pg_temp.tx(v_mariana, 'expense', 'Efectivo', 'Café', 68, current_date - 4, 'Latte');
  perform pg_temp.tx(v_mariana, 'expense', 'Efectivo', 'Café', 75, current_date - 2, 'Café y pan dulce');
  perform pg_temp.tx(v_mariana, 'expense', 'BBVA Débito', 'Café', 72, current_date - 1, 'Cold brew');
  perform pg_temp.tx(v_mariana, 'expense', 'BBVA Débito', 'Gasolina', 790, current_date - 3, 'Gasolina');
  perform pg_temp.tx(v_mariana, 'expense', 'Amex', 'Uber y DiDi', 165, current_date - 5, 'Uber al trabajo');
  perform pg_temp.tx(v_mariana, 'expense', 'Amex', 'Uber y DiDi', 210, current_date - 7, 'DiDi de regreso');

  -- Day-to-day spending (generated, deterministic): category, account, amount, days ago, note.
  for r in
    select * from (values
    ('Uber y DiDi', 'Amex', 140.50, 114, 'DiDi de regreso'),
    ('Gasolina', 'BBVA Débito', 660.00, 114, 'Gasolina'),
    ('Uber y DiDi', 'Amex', 155.00, 113, 'Uber aeropuerto'),
    ('Restaurantes', 'BBVA Débito', 445.50, 111, 'Comida corrida'),
    ('Restaurantes', 'BBVA Débito', 365.50, 110, 'Pozolería'),
    ('Gasolina', 'BBVA Débito', 670.00, 110, 'Gasolina'),
    ('Restaurantes', 'BBVA Débito', 210.00, 107, 'Tortas ahogadas'),
    ('Súper', 'BBVA Débito', 995.00, 105, 'Chedraui'),
    ('Café', 'BBVA Débito', 80.00, 105, 'Latte'),
    ('Uber y DiDi', 'Amex', 140.50, 104, 'Uber a casa'),
    ('Café', 'BBVA Débito', 85.00, 103, 'Café de olla'),
    ('Súper', 'BBVA Débito', 800.00, 101, 'La Comer'),
    ('Uber y DiDi', 'Amex', 100.00, 100, 'DiDi de regreso'),
    ('Uber y DiDi', 'Amex', 110.00, 99, 'DiDi de regreso'),
    ('Farmacia', 'Efectivo', 120.00, 99, 'Farmacia'),
    ('Uber y DiDi', 'Amex', 195.00, 97, 'Uber aeropuerto'),
    ('Compras', 'Amex', 520.00, 97, 'Mercado Libre'),
    ('Restaurantes', 'BBVA Débito', 295.00, 96, 'Tacos al pastor'),
    ('Café', 'Efectivo', 65.50, 94, 'Café de olla'),
    ('Café', 'BBVA Débito', 80.00, 94, 'Café y pan dulce'),
    ('Café', 'BBVA Débito', 55.00, 93, 'Cold brew'),
    ('Compras', 'Amex', 725.00, 92, 'Zapatos'),
    ('Uber y DiDi', 'Amex', 140.50, 90, 'Uber aeropuerto'),
    ('Café', 'BBVA Débito', 80.50, 89, 'Latte'),
    ('Restaurantes', 'BBVA Débito', 300.00, 88, 'Tacos al pastor'),
    ('Café', 'BBVA Débito', 70.00, 88, 'Café de olla'),
    ('Restaurantes', 'Amex', 480.00, 87, 'Tacos al pastor'),
    ('Restaurantes', 'BBVA Débito', 205.50, 85, 'Pozolería'),
    ('Restaurantes', 'BBVA Débito', 200.50, 85, 'Tortas ahogadas'),
    ('Uber y DiDi', 'Amex', 115.00, 85, 'Uber aeropuerto'),
    ('Salidas', 'Efectivo', 315.00, 84, 'Chelas con el equipo'),
    ('Café', 'Efectivo', 65.50, 83, 'Café de olla'),
    ('Café', 'BBVA Débito', 65.00, 81, 'Cold brew'),
    ('Súper', 'Amex', 1045.00, 80, 'Walmart'),
    ('Gasolina', 'BBVA Débito', 700.00, 80, 'Gasolina'),
    ('Salidas', 'Efectivo', 395.00, 80, 'Chelas con el equipo'),
    ('Café', 'Efectivo', 80.00, 78, 'Cold brew'),
    ('Café', 'BBVA Débito', 80.00, 78, 'Latte'),
    ('Uber y DiDi', 'Amex', 205.50, 78, 'Uber aeropuerto'),
    ('Restaurantes', 'BBVA Débito', 515.00, 77, 'Sushi con amigas'),
    ('Súper', 'Amex', 1210.00, 74, 'Chedraui'),
    ('Restaurantes', 'BBVA Débito', 520.00, 73, 'Tortas ahogadas'),
    ('Restaurantes', 'Amex', 290.00, 72, 'Comida corrida'),
    ('Café', 'BBVA Débito', 60.00, 72, 'Café de olla'),
    ('Uber y DiDi', 'Amex', 195.00, 71, 'DiDi de regreso'),
    ('Café', 'Efectivo', 70.00, 70, 'Café de olla'),
    ('Café', 'Efectivo', 70.00, 69, 'Café y pan dulce'),
    ('Uber y DiDi', 'Amex', 105.50, 68, 'Uber a casa'),
    ('Súper', 'Amex', 970.00, 67, 'La Comer'),
    ('Café', 'BBVA Débito', 75.00, 67, 'Latte'),
    ('Salidas', 'Efectivo', 370.00, 64, 'Cine'),
    ('Súper', 'Amex', 1075.00, 63, 'Soriana'),
    ('Restaurantes', 'BBVA Débito', 465.00, 62, 'Pozolería'),
    ('Café', 'Efectivo', 65.00, 61, 'Café y pan dulce'),
    ('Salidas', 'Amex', 230.00, 60, 'Karaoke'),
    ('Café', 'Efectivo', 65.00, 59, 'Latte'),
    ('Restaurantes', 'Amex', 315.00, 57, 'Comida corrida'),
    ('Uber y DiDi', 'Amex', 150.00, 57, 'Uber aeropuerto'),
    ('Café', 'Efectivo', 80.00, 55, 'Cold brew'),
    ('Uber y DiDi', 'Amex', 100.00, 53, 'Uber al trabajo'),
    ('Uber y DiDi', 'Amex', 110.00, 53, 'Uber aeropuerto'),
    ('Café', 'BBVA Débito', 65.00, 51, 'Café de olla'),
    ('Compras', 'Amex', 700.00, 51, 'Mercado Libre'),
    ('Restaurantes', 'Amex', 490.00, 50, 'Sushi con amigas'),
    ('Uber y DiDi', 'Amex', 195.00, 50, 'DiDi de regreso'),
    ('Restaurantes', 'Amex', 480.00, 49, 'Comida corrida'),
    ('Café', 'BBVA Débito', 80.00, 49, 'Latte'),
    ('Uber y DiDi', 'Amex', 125.50, 49, 'Uber al trabajo'),
    ('Restaurantes', 'BBVA Débito', 235.00, 45, 'Tacos al pastor'),
    ('Café', 'BBVA Débito', 80.50, 45, 'Latte'),
    ('Salidas', 'Amex', 475.00, 44, 'Cine'),
    ('Farmacia', 'BBVA Débito', 375.50, 42, 'Farmacia'),
    ('Súper', 'BBVA Débito', 1220.00, 41, 'Walmart'),
    ('Uber y DiDi', 'Amex', 170.50, 41, 'Uber al trabajo'),
    ('Compras', 'Amex', 730.00, 38, 'Zapatos'),
    ('Café', 'BBVA Débito', 70.50, 37, 'Café y pan dulce'),
    ('Farmacia', 'Efectivo', 250.00, 35, 'Medicinas'),
    ('Gasolina', 'BBVA Débito', 755.00, 34, 'Gasolina'),
    ('Café', 'BBVA Débito', 60.50, 33, 'Cold brew'),
    ('Uber y DiDi', 'Amex', 120.00, 33, 'DiDi de regreso'),
    ('Uber y DiDi', 'Amex', 195.00, 32, 'Uber al trabajo'),
    ('Salidas', 'Amex', 160.00, 32, 'Mezcalería'),
    ('Salidas', 'Efectivo', 380.00, 31, 'Chelas con el equipo'),
    ('Salidas', 'Amex', 265.50, 29, 'Karaoke'),
    ('Súper', 'Amex', 725.00, 28, 'Soriana'),
    ('Café', 'Efectivo', 60.00, 28, 'Café y pan dulce'),
    ('Restaurantes', 'Amex', 440.00, 27, 'Comida corrida'),
    ('Café', 'BBVA Débito', 85.50, 26, 'Latte'),
    ('Café', 'Efectivo', 70.50, 26, 'Cold brew'),
    ('Café', 'BBVA Débito', 55.00, 24, 'Latte'),
    ('Farmacia', 'Efectivo', 120.00, 23, 'Vitaminas'),
    ('Restaurantes', 'Amex', 230.50, 22, 'Tacos al pastor'),
    ('Gasolina', 'BBVA Débito', 695.00, 20, 'Gasolina'),
    ('Salidas', 'Efectivo', 240.00, 20, 'Boliche'),
    ('Gasolina', 'BBVA Débito', 740.50, 19, 'Gasolina'),
    ('Súper', 'Amex', 995.50, 18, 'Chedraui'),
    ('Uber y DiDi', 'Amex', 145.50, 18, 'Uber al trabajo'),
    ('Café', 'BBVA Débito', 55.50, 16, 'Latte'),
    ('Café', 'BBVA Débito', 60.00, 15, 'Cold brew'),
    ('Café', 'Efectivo', 65.00, 14, 'Café de olla'),
    ('Uber y DiDi', 'Amex', 210.00, 14, 'Uber al trabajo'),
    ('Súper', 'BBVA Débito', 1020.50, 13, 'La Comer'),
    ('Súper', 'BBVA Débito', 1000.00, 12, 'Chedraui'),
    ('Súper', 'BBVA Débito', 1005.00, 11, 'Chedraui'),
    ('Gasolina', 'BBVA Débito', 695.50, 11, 'Gasolina'),
    ('Gasolina', 'BBVA Débito', 755.00, 10, 'Gasolina'),
    ('Café', 'BBVA Débito', 80.50, 9, 'Latte'),
    ('Salidas', 'Efectivo', 180.00, 7, 'Mezcalería'),
    ('Uber y DiDi', 'Amex', 180.50, 5, 'Uber al trabajo'),
    ('Súper', 'BBVA Débito', 745.00, 4, 'Chedraui'),
    ('Farmacia', 'Efectivo', 370.00, 4, 'Vitaminas'),
    ('Uber y DiDi', 'Amex', 125.00, 2, 'Uber al trabajo'),
    ('Restaurantes', 'BBVA Débito', 230.50, 0, 'Hamburguesas')
    ) as s(category, account, amount, days_ago, description)
    where current_date - s.days_ago >= pg_temp.month_day(3, 1)
  loop
    perform pg_temp.tx(v_mariana, 'expense', r.account, r.category, r.amount, current_date - r.days_ago, r.description);
  end loop;

  -- ------------------------------------------------------------ budgets
  insert into public.budgets (user_id, name, amount, period_type, start_date, repeats)
  values (v_mariana, 'Comida', 6500, 'monthly', pg_temp.month_day(3, 1), true)
  returning id into v_budget;
  insert into public.budget_categories (budget_id, category_id, amount) values
    (v_budget, pg_temp.cat(v_mariana, 'Súper'), 4500),
    (v_budget, pg_temp.cat(v_mariana, 'Restaurantes'), 2000);

  insert into public.budgets (user_id, name, amount, period_type, start_date, repeats)
  values (v_mariana, 'Transporte', 1800, 'biweekly', pg_temp.month_day(3, 1), true)
  returning id into v_budget;
  insert into public.budget_categories (budget_id, category_id, amount) values
    (v_budget, pg_temp.cat(v_mariana, 'Uber y DiDi'), 1000),
    (v_budget, pg_temp.cat(v_mariana, 'Gasolina'), 800);

  insert into public.budgets (user_id, name, amount, period_type, start_date, repeats)
  values (v_mariana, 'Salidas', 1500, 'monthly', pg_temp.month_day(3, 1), true)
  returning id into v_budget;
  insert into public.budget_categories (budget_id, category_id, amount) values
    (v_budget, pg_temp.cat(v_mariana, 'Salidas'), 1500);

  insert into public.budgets (user_id, name, amount, period_type, start_date, repeats)
  values (v_mariana, 'Café', 350, 'weekly', current_date - extract(isodow from current_date)::int + 1 - 84, true)
  returning id into v_budget;
  insert into public.budget_categories (budget_id, category_id, amount) values
    (v_budget, pg_temp.cat(v_mariana, 'Café'), 350);

  -- ------------------------------------------------------------ favorites
  insert into public.favorite_transactions (user_id, label, icon, type, account_id, category_id, amount, description, use_count) values
    (v_mariana, 'Café', 'cafe-outline', 'expense', pg_temp.acct(v_mariana, 'Efectivo'), pg_temp.cat(v_mariana, 'Café'), 65, 'Café de olla', 14),
    (v_mariana, 'Uber', 'car-sport-outline', 'expense', pg_temp.acct(v_mariana, 'Amex'), pg_temp.cat(v_mariana, 'Uber y DiDi'), null, null, 9),
    (v_mariana, 'Súper', 'cart-outline', 'expense', pg_temp.acct(v_mariana, 'BBVA Débito'), pg_temp.cat(v_mariana, 'Súper'), null, 'Walmart', 6);
end;
$$;

commit;
