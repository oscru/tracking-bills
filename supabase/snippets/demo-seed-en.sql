-- English version of the demo data, for the English landing's screenshots —
-- LOCAL STACK ONLY. Run it right after demo-seed.sql: it renames the demo
-- user's accounts, categories, budgets, goals, favorites and descriptions,
-- and sets her app language to English. Re-run demo-seed.sql to go back to
-- Spanish.
--   podman exec -i supabase_db_bills-tracker-app psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/snippets/demo-seed-en.sql

begin;

create temp table demo_en (es text primary key, en text not null) on commit drop;
insert into demo_en (es, en) values
  -- accounts
  ('BBVA Débito', 'BBVA Debit'),
  ('Nu Ahorro', 'Nu Savings'),
  ('Efectivo', 'Cash'),
  ('Dólares', 'Dollars'),
  -- categories, budgets, goals, favorites
  ('Comida', 'Food'),
  ('Transporte', 'Transport'),
  ('Hogar', 'Home'),
  ('Salidas', 'Going out'),
  ('Suscripciones', 'Subscriptions'),
  ('Salud', 'Health'),
  ('Mascotas', 'Pets'),
  ('Compras', 'Shopping'),
  ('Sueldo', 'Salary'),
  ('Súper', 'Groceries'),
  ('Restaurantes', 'Restaurants'),
  ('Café', 'Coffee'),
  ('Uber y DiDi', 'Uber & DiDi'),
  ('Gasolina', 'Gas'),
  ('Luz', 'Electricity'),
  ('Renta', 'Rent'),
  ('Farmacia', 'Pharmacy'),
  ('Viaje a Oaxaca', 'Trip to Oaxaca'),
  ('Fondo de emergencia', 'Emergency fund'),
  -- descriptions
  ('Quincena', 'Paycheck'),
  ('Diseño de logo', 'Logo design'),
  ('Mi mitad de la renta', 'My half of the rent'),
  ('Croquetas Luna', 'Food for Luna'),
  ('CFE bimestral', 'Electric bill'),
  ('Mitad del súper', 'Half the groceries'),
  ('Mitad del gas y agua', 'Half of gas & water'),
  ('Cajero', 'ATM'),
  ('Pago Amex', 'Amex payment'),
  ('Para Oaxaca', 'For Oaxaca'),
  ('Apartado', 'Set aside'),
  ('Limpieza dental', 'Dental cleaning'),
  ('Vacuna de Luna', 'Luna''s vaccine'),
  ('Audífonos', 'Headphones'),
  ('Cena de cumple', 'Birthday dinner'),
  ('Boleto concierto', 'Concert ticket'),
  ('Mitad del Airbnb', 'Half the Airbnb'),
  ('Mitad del Uber al aeropuerto', 'Half the airport Uber'),
  ('Tacos del viernes', 'Friday tacos'),
  ('Regalo de Ceci (cooperacha)', 'Gift for Ceci (pool)'),
  ('Comida en la fonda', 'Lunch at the fonda'),
  ('Café y pan dulce', 'Coffee & pastry'),
  ('Café de olla', 'Café de olla'),
  ('Uber al trabajo', 'Uber to work'),
  ('DiDi de regreso', 'DiDi home'),
  ('Uber aeropuerto', 'Airport Uber'),
  ('Uber a casa', 'Uber home'),
  ('Comida corrida', 'Lunch special'),
  ('Pozolería', 'Pozole'),
  ('Zapatos', 'Shoes'),
  ('Chelas con el equipo', 'Beers with the team'),
  ('Sushi con amigas', 'Sushi with friends'),
  ('Cine', 'Movies'),
  ('Medicinas', 'Medicine'),
  ('Mezcalería', 'Mezcal bar'),
  ('Boliche', 'Bowling'),
  ('Vitaminas', 'Vitamins'),
  ('Hamburguesas', 'Burgers');

create temp table demo_users on commit drop as
  select id from auth.users where email like '%@demo.genobills.test';

update public.accounts a set name = m.en from demo_en m
  where a.name = m.es and a.user_id in (select id from demo_users);
update public.categories c set name = m.en from demo_en m
  where c.name = m.es and c.user_id in (select id from demo_users);
update public.budgets b set name = m.en from demo_en m
  where b.name = m.es and b.user_id in (select id from demo_users);
update public.goals g set name = m.en from demo_en m
  where g.name = m.es and g.user_id in (select id from demo_users);
update public.favorite_transactions f set label = coalesce(ml.en, f.label), description = coalesce(md.en, f.description)
  from public.favorite_transactions f2
  left join demo_en ml on ml.es = f2.label
  left join demo_en md on md.es = f2.description
  where f.id = f2.id and f.user_id in (select id from demo_users);
-- Received transfers are mirrors only their sender may change; this renames both sides.
select set_config('app.peer_sync', 'on', true);
update public.transactions t set description = m.en from demo_en m
  where t.description = m.es and t.user_id in (select id from demo_users);
select set_config('app.peer_sync', 'off', true);
update public.profiles set language = 'en' where id in (select id from demo_users);

commit;
