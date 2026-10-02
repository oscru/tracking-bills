# TODO — Deficiencias detectadas (auditoría 2026-10-02)

Auditoría de cabos sueltos, lógica de negocio mal planteada y deuda técnica sobre
lo ya construido (sin features nuevas). Organizado por severidad. Marcar `[x]`
al corregir.

## 🔴 Bugs reales (afectan datos o rompen flujos)

- [x] **Ciclo de presupuesto mensual mal calculado en meses de 29-31 días.**
      `packages/core/src/utils/index.ts:907-910` (`periodSpanEnd`). Un budget
      que arranca el 31-ene calcula su fin como 2-mar en vez de 28-feb (overflow
      de `Date` en JS). Con `repeats: true` el error se arrastra y crece cada
      renovación.
      **Fix (2026-10-02):** clampear "un mes después" al último día real del
      mes destino antes de restar un día (31-ene → 27-feb; 31-ene en año
      bisiesto → 28-feb). Verificado con casos límite + `tsc --noEmit` en
      `packages/core` y `apps/mobile`.
- [x] **Import de CSV fusiona transacciones reales distintas.**
      `packages/core/src/import-export/parse.ts:127-137` (`movementKey`). No
      incluía currency/tags/status, así que dos compras idénticas el mismo día
      en la misma cuenta/categoría se colapsaban en una sola fila al importar.
      **Fix (2026-10-02):** `movementKey` ahora incluye `currencyCode`,
      `isCompleted` y `tagNames` (normalizados/ordenados). De paso se corrigió
      `transferKey` con el mismo problema latente (dos transferencias reales
      iguales en monto/cuentas/fecha también se fusionaban). Verificado con
      `tsc --noEmit` en `packages/core`.
- [~] **Export → reimport de una transferencia a meta crea una cuenta basura.**
      `export.ts:36-40` + `parse.ts:164-202`. Se exporta como texto plano
      `"Objetivo: <nombre>"`, y al reimportar se crea una cuenta real con ese
      nombre literal, perdiendo el vínculo con el goal.
      **Mitigado parcialmente (2026-10-02):** se implementó "meta ligada a cuenta
      de ahorro" (ver sección de rediseños abajo) — una meta con cuenta vinculada
      ya no genera el placeholder "Objetivo: X" porque sus aportaciones son
      transferencias normales `to_account_id`, que exportan/reimportan por el
      camino ya correcto. **Pendiente:** metas *virtuales* (sin cuenta
      vinculada, que siguen siendo el default) todavía generan el placeholder
      y el bug original sigue ahí para ellas. Falta decidir: (1) detectar
      `"Objetivo: <nombre>"` al reimportar y hacer match por nombre contra las
      metas del usuario, o (2) marcarlo como error de fila en vez de crear
      cuenta fantasma.
- [ ] **Cambiar el tipo de una categoría padre (Gasto↔Ingreso) huerfaniza sus
      subcategorías.** `apps/mobile/src/features/categories/category-form.tsx:108-120`.
      El trigger `check_category_parent` solo valida al tocar el hijo, nunca al
      actualizar el padre. El hijo queda invisible en toda la UI pero sigue
      referenciado por transacciones viejas.
- [ ] **Archivar una categoría padre vuelve inseleccionables sus subcategorías
      activas.** `category-picker.tsx:63-69`. No hay forma de "retirar solo el
      padre" sin perder acceso a hijos vigentes.
- [ ] **`accounts.currency` e `initial_balance` están documentados como
      "bloqueados tras creación" pero nada en la DB lo impide.** Ninguna
      trigger protege esas columnas; un UPDATE directo reinterpretaría
      silenciosamente todo el historial de la cuenta.

## 🟡 Inconsistencias de reglas de negocio

- [ ] En Analytics, `BudgetsProgressCard` ignora el filtro de moneda de la
      pantalla — mezcla presupuestos de todas las monedas.
- [ ] Esa misma tarjeta ignora el mes que el usuario está navegando (siempre
      usa "ahora"), sin aviso visual.
- [ ] Deshabilitar una moneda en Preferencias no valida si ya está en uso por
      cuentas/budgets/goals existentes.
- [ ] Borrar una categoría vinculada a un budget (`budget_categories` `on
      delete cascade`) puede dejarlo con 0 categorías, y se muestra como
      "presupuesto perfecto" (0% gastado) en vez de marcarlo roto.
- [ ] Al cambiar el tipo de una transacción (income↔expense), `updateTransaction`
      no limpia `category_id` — depende de que la DB rechace la combinación y
      el usuario ve un error crudo de Postgres.
- [ ] Las utilidades de analytics en `packages/core/src/utils/index.ts` mezclan
      dos convenciones de moneda distintas (unas esperan pre-filtrado por el
      caller, otras filtran solas) — riesgo de mezclar monedas en pantallas
      nuevas.
- [ ] Botones de login con Google/Apple ya están visibles en producción pero el
      backend sigue "pending to activate" — un usuario real que los toque hoy
      se encuentra con un error.
- [x] Meta que llega al 100% sigue aceptando aportaciones indefinidamente, sin
      opción de cerrarla/archivarla.
      **Fix (2026-10-02):** nueva columna `goals.is_completed` (migración
      `20261002160000_goal_is_completed.sql`), explícita y manual — nunca
      automática. La UI solo ofrece "Marcar como completada" una vez que
      `progress.isComplete` es true (botón en `goals/[id]/index.tsx`), y se
      puede revertir ("Marcar como no completada"). Regla de negocio nueva
      ligada a esto: **archivar una meta NO completada la desvincula de su
      cuenta de ahorro** (libera la cuenta para otra meta); archivar una meta
      YA completada conserva el vínculo (la cuenta queda como registro de
      dónde vive ese dinero). Implementado como trigger
      `goals_unlink_account_on_archive` — atómico, mismo patrón que el de
      cuentas. Probado: meta completada archivada conserva `account_id`; meta
      no completada archivada lo pone en `null`. El diálogo de confirmación
      avisa del efecto cuando aplica. Badge "Completada" en lista y detalle.
      Verificado con `tsc --noEmit` en ambos paquetes.
- [ ] Mensaje de error confuso en metas con "ritmo de ahorro" personalizado: si
      falta "cada cuántos días", el error apunta al campo de monto.

## 🟢 Pulido / deuda técnica (no rompen nada hoy)

- [ ] `budgets-card.tsx` (Home) y `budgets-progress-card.tsx` (Analytics)
      duplican ~15 líneas de cálculo idénticas, y ya divergieron (Home recorta
      a top-3, Analytics no).
- [ ] `budgetProgress`/`goalProgress`/`categorySpentInRange` en `packages/core`
      repiten el mismo patrón de filtrado tres veces.
- [ ] Home y Analytics mantienen dos UIs distintas para "gasto por categoría"
      sobre la misma data.
- [ ] Colores hex hardcodeados (`#9CA3AF`, `#4D7C0F`, etc.) repetidos en vez de
      tokens del design system "Lima + tinta".
- [ ] Toda cuenta auto-creada por import queda tipo `debit` sin importar el
      nombre real (ej. "Tarjeta Oro").
- [ ] Todo el cálculo de dinero usa floats de JS pese a que la DB usa
      `numeric(14,2)` — riesgo bajo de desvíos de centavos en sumas largas.
- [ ] No existe borrado de categorías en la UI (solo archivar), pero la DB sí
      tiene `on delete cascade` en `parent_id` — deuda latente si se agrega
      borrado en el futuro.
- [ ] `isCurrentMonth` en Home se congela al montar el componente — una sesión
      larga que cruce medianoche deja el botón "mes siguiente" deshabilitado un
      día de más.

---

## Rediseños implementados

- [x] **Meta (goal) opcionalmente ligada a una cuenta de ahorro real.**
      Antes, una meta era siempre un "sobre virtual": las aportaciones eran
      transferencias con `goal_id` y sin cuenta destino real — por eso el
      export tenía que inventar el placeholder "Objetivo: X" (ver bug arriba).
      Ahora `goals.account_id` (nullable) permite ligar la meta a una cuenta
      real existente, sin tocar el comportamiento de las metas que ya existen:
      - `account_id = null` (default) → sigue funcionando exactamente igual
        que antes.
      - `account_id` seteado → las aportaciones se registran como
        transferencias normales (`to_account_id` = esa cuenta, sin `goal_id`),
        el progreso de la meta es simplemente el saldo real de esa cuenta
        (reutiliza `accountBalance`), y el export/import ya no necesita ningún
        caso especial.
      - Un trigger (`check_goal_account`) exige que la cuenta ligada sea del
        mismo usuario y de la misma divisa que la meta — probado manualmente
        contra la DB local (caso válido pasa, caso de divisas distintas se
        rechaza con error claro).
      Implementado: migración `20261002120000_goal_linked_account.sql`
      (aplicada local + tipos regenerados), `validators/goal.ts`
      (`account_id` en create/update), `utils/index.ts` (`goalProgress` acepta
      `linkedAccount` opcional), UI en `goal-form.tsx` (switch "Vincular una
      cuenta de ahorro" + picker filtrado por divisa), `add-contribution-sheet.tsx`
      (usa `to_account_id` en vez de `goal_id` cuando aplica, excluye la propia
      cuenta de ahorro como origen), y las pantallas de lista/detalle de metas
      (usan el saldo de la cuenta ligada para el progreso y muestran su nombre).
      Verificado con `tsc --noEmit` limpio en `packages/core` y `apps/mobile`.
      **Pendiente:** push de esta migración a Supabase hosted (ver abajo); no
      se migran metas virtuales existentes automáticamente (es opt-in).

- [x] **Unicidad cuenta↔meta (bug encontrado durante el mapeo del diseño anterior).**
      Nada impedía ligar dos metas a la misma cuenta — ambas habrían mostrado
      el mismo saldo como progreso, y cualquier aporte habría inflado las dos.
      **Fix (2026-10-02):** `create unique index ... on goals (account_id)
      where account_id is not null` (migración `20261002130000_goal_account_unique.sql`,
      aplicada local y probada: segundo intento de ligar la misma cuenta falla
      con `duplicate key value violates unique constraint`). Además, bloqueado
      también en la UI (no solo la DB): `AccountPicker` ahora acepta
      `excludeIds`, y `goal-form.tsx` recibe `accountsLinkedElsewhere` (todas
      las cuentas ya ligadas a *otra* meta) desde `goals/new.tsx` y
      `goals/[id]/edit.tsx`, así que esas cuentas ni siquiera aparecen como
      opción al elegir la cuenta de ahorro. Verificado con `tsc --noEmit`
      limpio en ambos paquetes.

- [x] **Archivar la cuenta ligada a una meta no tenía manejo explícito** (quedaba
      apuntando a una cuenta inseleccionable/archivada, sin aviso).
      **Fix (2026-10-02):** en `accounts/[id]/index.tsx`, archivar una cuenta
      que está ligada a una meta ahora también la desvincula (`account_id =
      null` en esa meta) — vuelve al modelo virtual en vez de quedarse
      apuntando a una cuenta archivada. El diálogo de confirmación avisa
      explícitamente antes de archivar ("la meta se desvinculará y volverá a
      llevar su progreso de forma manual"). Eliminar la cuenta no necesitó
      código nuevo: el `on delete set null` de la migración ya lo cubre (y en
      la práctica es casi inalcanzable por el `on delete restrict` de las
      transacciones). **Nota/efecto secundario:** el progreso de la meta cae a
      lo que tenga vía `goal_id` (hoy nada, porque sus aportaciones se
      guardaron como `to_account_id`) — el dinero no se pierde, pero el
      número de "progreso" se resetea en la UI hasta vincular otra cuenta o
      registrar aportaciones manuales. Verificado con `tsc --noEmit`.

- [x] **Se podía archivar una cuenta con saldo distinto de cero** (encontrado
      al mapear el caso anterior: archivar nunca pone el saldo en 0 ni borra
      transacciones — solo oculta la cuenta de los pickers — así que el dinero
      quedaba "enterrado" en una cuenta archivada y fácil de olvidar).
      **Fix (2026-10-02), dos capas:**
      - **DB**: trigger `check_account_archive_zero_balance` (migración
        `20261002140000_account_archive_zero_balance.sql`) recalcula el saldo
        real igual que `accountBalance`/`transactionEffect` (initial_balance +
        transacciones liquidadas, incluyendo el lado `to_account_id` de
        transferencias) y rechaza el `UPDATE ... SET archived = true` si no da
        exactamente 0. Probado: cuenta con saldo falla, cuenta en $0 archiva
        bien, cuenta que recibió saldo por transferencia también bloquea.
      - **UI**: `accounts/[id]/index.tsx` valida el saldo antes de abrir el
        diálogo de confirmación y muestra un `ErrorCard` explicando qué hacer
        ("transfiere el saldo o ajústalo a 0 primero") en vez de dejar que
        llegue el error crudo de Postgres; y por si acaso llega (carrera entre
        dispositivos), `errors.ts` ahora traduce ese `check_violation`
        específico a un mensaje amigable también.
      Verificado con `tsc --noEmit` limpio en ambos paquetes.

- [x] **Archivar cuenta + desvincular meta no eran atómicos** (dos mutaciones
      separadas desde el cliente — si la segunda fallaba por una conexión
      inestable, quedaba una cuenta archivada aún ligada a una meta).
      **Fix (2026-10-02):** migrada la lógica al backend. Trigger
      `accounts_unlink_goal_on_archive` (migración
      `20261002150000_account_archive_unlinks_goal.sql`) desvincula cualquier
      meta ligada en la MISMA transacción que archiva la cuenta — un solo
      `UPDATE accounts SET archived = true` ya lo hace todo, sin segunda
      llamada. Probado: un único `update` dejó `goals.account_id = null`
      automáticamente. El cliente (`accounts/[id]/index.tsx`) ya no hace la
      segunda mutación; `useUpdateAccount` ahora también invalida
      `queryKeys.goals.all` para que el caché de metas no se quede con el
      `account_id` viejo. Verificado con `tsc --noEmit` en ambos paquetes.

- [x] **Inconsistencia: archivar la cuenta directamente no respetaba
      `is_completed`** (encontrada justo después de construir la regla
      "meta completada conserva su cuenta al archivarse" — esa regla solo
      vivía en el trigger de la meta, no en el de la cuenta, así que archivar
      la cuenta en vez de la meta desvinculaba igual una meta ya completada).
      **Fix (2026-10-02):** migración
      `20261002170000_account_archive_respects_goal_completed.sql` —
      `unlink_goal_on_account_archive` ahora filtra `and not is_completed`.
      Probado: archivar la cuenta de una meta completada conserva el vínculo;
      archivar la cuenta de una meta abierta sigue desvinculando. Ambas rutas
      (archivar la meta vs. archivar la cuenta) ya dan el mismo resultado.

## Backlog (pendiente — requiere pensar la estructura antes de tocar código)

- [ ] **Texto engañoso al eliminar una meta ligada a cuenta.** El diálogo de
      `goals/[id]/index.tsx` dice "Solo se puede eliminar si no tiene
      aportaciones registradas", pero para una meta ligada eso es falso: sus
      aportaciones usan `to_account_id`, no `goal_id`, así que el
      `on delete restrict` nunca aplica — se puede eliminar siempre, con o sin
      historial, sin aviso real de que eso pasa.
- [ ] **Eliminar (no archivar) una cuenta ligada sin fondos no avisa** sobre la
      meta que se va a desvincular (el `on delete set null` de la DB lo
      resuelve sin corromper datos, pero `accounts/[id]/edit.tsx` no muestra
      ningún aviso, a diferencia del flujo de archivar que sí lo hace).

## Pendiente aparte (no es deficiencia, es trabajo en curso)

- [ ] Push de las migraciones pendientes a Supabase hosted
      (`supabase db push`): `20261001120000_profile_travel_mode`,
      `20261001130000_profile_enabled_currencies`,
      `20261001140000_budget_goal_currency`,
      `20261001150000_transfer_currency_match`,
      `20261002120000_goal_linked_account`,
      `20261002130000_goal_account_unique`,
      `20261002140000_account_archive_zero_balance`,
      `20261002150000_account_archive_unlinks_goal`,
      `20261002160000_goal_is_completed`,
      `20261002170000_account_archive_respects_goal_completed`.
- [ ] Commitear los archivos modificados de la feature de multi-moneda +
      travel mode + meta-ligada-a-cuenta (actualmente sin stage).
