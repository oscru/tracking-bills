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
- [x] **Cambiar el tipo de una categoría padre (Gasto↔Ingreso) huerfaniza sus
      subcategorías.** `apps/mobile/src/features/categories/category-form.tsx:108-120`.
      El trigger `check_category_parent` solo valida al tocar el hijo, nunca al
      actualizar el padre. El hijo queda invisible en toda la UI pero sigue
      referenciado por transacciones viejas.
      **Fix (2026-10-02), criterio: bloquear (no hay forma sensata de migrar
      automáticamente el tipo de una subcategoría).** Migración
      `20261002180000_category_parent_type_and_archive_cascade.sql` extiende
      `check_category_parent` para rechazar el cambio de `type` en un padre
      que tiene subcategorías. `category-form.tsx` bloquea los chips de
      Tipo (con hint) cuando la categoría en edición tiene subcategorías, y
      `errors.ts` traduce el `check_violation` a un mensaje amigable por si
      llega a fallar igual. Probado contra la DB local. `tsc --noEmit` limpio.
- [x] **Archivar una categoría padre vuelve inseleccionables sus subcategorías
      activas.** `category-picker.tsx:63-69`. No hay forma de "retirar solo el
      padre" sin perder acceso a hijos vigentes.
      **Fix (2026-10-02), criterio: cascadear con aviso (aquí sí hay una
      resolución obvia y segura — "ya no uso esta rama").** Misma migración:
      trigger `categories_cascade_archive_subcategories` archiva
      atómicamente las subcategorías activas cuando se archiva el padre (una
      sola `UPDATE categories SET archived = true` lo hace todo). El diálogo
      de confirmación en `categories/[id]/index.tsx` lista cuántas y cuáles
      subcategorías se van a archivar también. Reversible: desarchivar cada
      una por separado. Probado contra la DB local (solo las activas
      cambian, una ya archivada se queda igual). `tsc --noEmit` limpio.
- [x] **`accounts.currency` e `initial_balance` están documentados como
      "bloqueados tras creación" pero nada en la DB lo impide.** Ninguna
      trigger protege esas columnas; un UPDATE directo reinterpretaría
      silenciosamente todo el historial de la cuenta.
      **Fix (2026-10-02):** trigger `check_account_locked_fields` (migración
      `20261002210000_account_locked_fields.sql`), `before update of
      currency, initial_balance` — rechaza el cambio si cualquiera de los dos
      difiere de su valor original. Confirmé antes de implementar que ningún
      flujo legítimo depende de mutar `initial_balance` después de crear la
      cuenta ("Ajustar saldo" crea una transacción, nunca toca esa columna) y
      que `updateAccount()` es el único call-site que actualiza `accounts`
      (ya gateado por `accountUpdateSchema`, que excluye ambos campos) — cero
      riesgo de romper algo existente. Probado: cambiar `currency` falla,
      cambiar `initial_balance` falla, actualizar cualquier otra columna
      (ej. `name`) sigue funcionando normal. `errors.ts` traduce el error a
      un mensaje amigable. Verificado con `tsc --noEmit` en ambos paquetes.

## 🟡 Inconsistencias de reglas de negocio

- [x] En Analytics, `BudgetsProgressCard` ignora el filtro de moneda de la
      pantalla — mezcla presupuestos de todas las monedas.
      **Regla de negocio:** Analytics acota TODO a una moneda a la vez (no hay
      tipo de cambio para mezclarlas) — Presupuestos debe seguir esa misma
      regla.
      **Fix (2026-10-02):** `BudgetsProgressCard` ahora recibe `currency`
      como prop y filtra `budget.currency === currency`; `analytics.tsx` le
      pasa el `currency` que ya calcula para el resto de la pantalla.
      `tsc --noEmit` limpio.
- [x] Esa misma tarjeta ignora el mes que el usuario está navegando (siempre
      usa "ahora"), sin aviso visual.
      **Regla de negocio (ya era la correcta, solo faltaba decirla):** cada
      presupuesto corre su propio ciclo anclado a su `start_date`, no al
      calendario — por diseño, la tarjeta SIEMPRE muestra el periodo *actual*
      de cada presupuesto, sin importar qué mes esté navegando el resto de la
      pantalla arriba. No era un bug de lógica, era falta de un aviso visual.
      **Fix (2026-10-02):** agregado un subtítulo "Periodo actual de cada
      presupuesto — no cambia con el mes de arriba" bajo el título de la
      tarjeta.
- [x] Deshabilitar una moneda en Preferencias no valida si ya está en uso por
      cuentas/budgets/goals existentes.
      **Regla de negocio:** `enabled_currencies` solo cura qué se ofrece para
      cosas NUEVAS — no se puede deshabilitar una divisa que ya está en uso
      por una cuenta/budget/goal existente (no rompe nada técnicamente, pero
      deja algo "en uso" sin ninguna explicación visible en Preferencias).
      **Fix (2026-10-02), dos capas:**
      - **DB**: trigger `check_enabled_currencies_in_use` (migración
        `20261002190000_enabled_currencies_in_use.sql`) calcula qué códigos se
        quitaron del array y rechaza el update si alguno sigue en uso por
        accounts/budgets/goals. Probado: quitar una divisa en uso falla,
        quitar una sin uso funciona.
      - **UI**: `CurrencyMultiPicker` ahora acepta `inUseCodes` y bloquea esas
        filas (atenuadas, con "· en uso"); `preferences.tsx` calcula
        `inUseCodes` desde `useAccounts/useBudgets/useGoals` y además bloquea
        defensivamente en `toggle()` con un `ErrorCard`, con `onError` en la
        mutación por si la DB lo atrapa primero (carrera entre dispositivos).
        `errors.ts` traduce el `check_violation` a mensaje amigable.
      Verificado con `tsc --noEmit` en ambos paquetes.
- [x] Borrar una categoría vinculada a un budget (`budget_categories` `on
      delete cascade`) puede dejarlo con 0 categorías, y se muestra como
      "presupuesto perfecto" (0% gastado) en vez de marcarlo roto.
      **Resuelto de raíz (2026-10-02):** al construir el borrado real de
      categorías (ver "Rediseños implementados" abajo), la regla de negocio
      quedó: una categoría asignada a un presupuesto **no se puede eliminar**
      — hay que quitarla del presupuesto primero. Ya no existe ningún camino
      (ni siquiera uno nuevo) para que un presupuesto llegue a 0 categorías
      por un borrado de categoría. El caso de "0% gastado se ve como
      perfecto" sigue siendo cierto en abstracto si algún día se permite
      vaciar un presupuesto de otra forma, pero hoy no hay ningún camino
      alcanzable para eso (el formulario exige mínimo 1 categoría).
      **Además (2026-10-02), el fix de fondo pedido aparte:** `budgetProgress`
      ahora distingue explícitamente "sin categorías" de "0% gastado, vas
      bien" vía un nuevo campo `hasCategories` en `BudgetProgress` — antes se
      veían idénticos. `BudgetProgressBar` muestra una alerta ("Sin
      categorías asignadas — este presupuesto no está contando ningún gasto")
      en vez de la barra verde cuando `hasCategories` es `false`. Actualizados
      los 5 call sites (Home, Analytics, lista y detalle de presupuestos,
      incluido el desglose por categoría). De paso también encontré y arreglé
      el mismo problema en el contador "N de M bajo control" de Home
      (`budgets-card.tsx`): un presupuesto sin categorías contaba como
      "bajo control" porque `isOverBudget` es `false` cuando nunca puede
      gastar nada. Revisé si hay otra vía viva hacia 0 categorías aparte del
      delete ya bloqueado (edición de presupuesto exige mínimo 1 vía Zod,
      archivar una categoría no la quita de `budget_categories`) — no
      encontré ninguna alcanzable desde la app hoy. **Nota aparte encontrada
      de paso, no resuelta:** una categoría SIN subcategorías puede cambiar
      de tipo (income↔expense) libremente aunque esté asignada a un
      presupuesto — no vacía sus categorías, pero la deja "muda" (nunca
      podrá volver a registrar gasto, porque una transacción de gasto no
      puede usar una categoría tipo income). Lo dejo anotado, no lo arreglé
      todavía.
      Verificado con `tsc --noEmit` en ambos paquetes.
- [x] Al cambiar el tipo de una transacción (income↔expense), `updateTransaction`
      no limpia `category_id` — depende de que la DB rechace la combinación y
      el usuario ve un error crudo de Postgres.
      **Regla de negocio:** una categoría pertenece a exactamente un tipo —
      cambiar Gasto↔Ingreso↔Transferencia siempre debe limpiar cualquier
      campo que solo tenga sentido para el tipo anterior (categoría para
      income/expense; cuenta/meta destino para transfer).
      **Fix (2026-10-02):**
      - `movement-form.tsx`: `changeType` ahora limpia `categoryId` en
        **cualquier** cambio de tipo (antes solo lo hacía al pasar a
        transferencia) — cubre tanto crear como editar, mismo formulario.
      - `validators/transaction.ts`: `transactionUpdateSchema` gana dos
        `.refine()` estructurales (sin necesitar consultar la DB): una
        transferencia nunca lleva `category_id`, e income/expense nunca
        llevan `to_account_id`/`goal_id` — solo se activan cuando `type` se
        está cambiando explícitamente en ese patch, no cuando está ausente
        (verificado con una tabla de verdad aparte para no romper updates
        parciales legítimos, ej. editar solo la cuenta destino de una
        transferencia existente).
      - `errors.ts`: el mensaje de la DB para categoría-no-coincide-con-tipo
        ahora traduce a "Esa categoría no es válida para este tipo de
        movimiento. Elige otra." en vez de caer en el genérico.
      Verificado con `tsc --noEmit` en ambos paquetes.
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

- [x] `budgets-card.tsx` (Home) y `budgets-progress-card.tsx` (Analytics)
      duplican ~15 líneas de cálculo idénticas, y ya divergieron (Home recorta
      a top-3, Analytics no).
      **Fix (2026-10-02):** extraído a `features/budgets/use-budget-progress-rows.ts`
      — un hook `useBudgetProgressRows(currency?)` compartido. Home lo llama
      sin `currency` (no está acotado a una sola) y sigue recortando a
      top-3 localmente; Analytics le pasa su `currency` seleccionada. Mismo
      cálculo, una sola fuente — ya no pueden volver a divergir en silencio.
      Verificado con `tsc --noEmit` en `apps/mobile`.
- [x] `budgetProgress`/`goalProgress`/`categorySpentInRange` en `packages/core`
      repiten el mismo patrón de filtrado tres veces.
      **Fix (2026-10-02):** extraído a `sumSettledAmount(transactions,
      currency, predicate)` — las reglas que nunca cambian (`is_completed`,
      misma `currency`) viven ahí una sola vez; cada función conserva su
      propio `predicate` (categoría+rango de fechas, categoría única+rango,
      o `goal_id`). Verifiqué equivalencia exacta con un caso de prueba
      comparando el loop viejo vs. el nuevo (mismo resultado, 150). `tsc
      --noEmit` limpio en ambos paquetes.
- [x] Home y Analytics mantienen dos UIs distintas para "gasto por categoría"
      sobre la misma data.
      **Revisado (2026-10-02) — no era deuda técnica real, el hallazgo fue
      impreciso.** Home (`category-spend-card.tsx`) es una dona +
      lista (`categorySpendBreakdown`) respondiendo "¿en qué se fue mi
      dinero este mes?". Analytics (`category-trend-card.tsx`) es solo lista
      con flechas ▲/▼ (`categoryTrend`) respondiendo "¿qué categoría subió o
      bajó vs. el mes pasado?". No es código duplicado — son dos preguntas
      distintas, no hay nada seguro que deduplicar sin perder funcionalidad.
      Se deja así; el riesgo real (si cambia la regla de "qué cuenta como
      gasto de categoría" hay que tocar ambas por separado) queda anotado
      aquí por si se quiere unificar el concepto más adelante, pero no es
      una acción pendiente.
- [x] Colores hex hardcodeados (`#9CA3AF`, `#4D7C0F`, etc.) repetidos en vez de
      tokens del design system "Lima + tinta".
      **Fix completo (2026-10-02).** Resultó mucho más grande de lo que
      sugería el hallazgo original: >200 ocurrencias de hex en todo el app,
      la mayoría paletas de categorías/gráficas (intencionalmente variadas,
      NO tocadas). Centralicé los que sí son tokens repetidos del design
      system: nuevo `packages/ui/src/icon-colors.ts` exporta `ICON_COLORS`
      (18 valores, espejo exacto de `preset.js`), exportado desde `@repo/ui`.
      Reemplazadas **176 ocurrencias en 48 archivos** (codemod + 3 ediciones
      manuales para los únicos `#FFFFFF` inequívocos — los pareados con su
      contraparte oscura `dark ? '#16191D' : '#FFFFFF'`, que sí son
      claramente `surface`/`surfaceDark`; el resto de `#FFFFFF` sueltos en
      `calendar-heatmap.tsx` son texto sobre celdas de color, no el token
      "surface", y se dejaron igual a propósito). Deliberadamente fuera de
      alcance: colores de paleta de categorías/gráficas, y cualquier
      `#FFFFFF`/gris genérico sin una contraparte oscura que confirme que es
      realmente ese token — mapear por valor numérico sin ese contexto
      arriesgaba cambiar el significado semántico, no solo el nombre.
      **No añade dark-mode** donde no existía: un call site que antes usaba
      un solo hex fijo (sin `useColorScheme`) sigue usando un solo token fijo
      — mismo comportamiento, solo centralizado. Verificado: 0 ocurrencias
      restantes de los 18 valores fuera de `icon-colors.ts`, `tsc --noEmit`
      limpio en `packages/ui`/`packages/core`/`apps/mobile`, `eslint .`
      limpio (0 errores).
- [x] Toda cuenta auto-creada por import queda tipo `debit` sin importar el
      nombre real (ej. "Tarjeta Oro").
      **Fix (2026-10-02):** nuevo `guess-account-type.ts` — heurística
      best-effort por palabras clave en el nombre (español/inglés, sin
      acentos): efectivo/cash→`cash`, ahorro→`savings`,
      tarjeta/visa/mastercard/amex (sin decir "débito")→`credit_card`,
      préstamo/hipoteca→`loan`, inversión/afore→`investment`, crédito
      genérico→`credit`, cualquier otra cosa sigue cayendo en `debit` (mismo
      fallback de siempre). El formato de import no trae ninguna columna de
      tipo de cuenta — el nombre es la única pista real que hay. No es
      arriesgado si se equivoca: `type` no está bloqueado tras crear la
      cuenta (a diferencia de `currency`/`initial_balance`), se corrige en un
      toque desde "Editar cuenta". Probado con 11 nombres de ejemplo, todos
      clasificados correctamente. `AUTO_ACCOUNT_TYPE` (la constante fija que
      reemplaza) se eliminó por quedar sin uso. `tsc --noEmit` limpio en
      `packages/core` y `apps/mobile`.
- [x] Todo el cálculo de dinero usa floats de JS pese a que la DB usa
      `numeric(14,2)` — riesgo bajo de desvíos de centavos en sumas largas.
      **Decisión de alcance:** un fix decimal "de punta a punta" (que los
      `numeric` lleguen de Supabase como string + librería de precisión
      decimal) requeriría reemplazar el parser JSON global del cliente —
      afecta cada tabla de la app, no solo dinero, altísimo riesgo para un
      hallazgo de riesgo bajo. En su lugar: **aritmética en centavos
      enteros**, el patrón estándar para esto en JS — exacto en IEEE754
      (hasta 2^53), sin dependencias nuevas, sin tocar la capa de datos.
      **Fix (2026-10-02):** nuevos helpers `toCents`/`fromCents` en
      `packages/core/src/utils/index.ts`; reescritas las 12 funciones que
      acumulan dinero para sumar en centavos y convertir a float solo al
      final: `accountBalance`/`transactionEffect`/`projectedAccountBalance`,
      `totalBalancesByCurrency`, `monthTotals`, `categorySpendBreakdown`,
      `categoryMonthlyHistory`, `monthlyIncomeExpenseHistory`, `rangeTotals`,
      `dailyTransactionTotals`, `monthlyTransactionTotalsForYear`,
      `categoryTrend`, y el `sumSettledAmount` compartido (de donde salen
      `budgetProgress`/`categorySpentInRange`/`goalProgress`). Las firmas
      públicas no cambiaron — siguen devolviendo `number` (dólares/pesos),
      solo cambió cómo se acumula internamente. `evalAmount` (la calculadora
      del teclado) se dejó igual a propósito: ya redondeaba a centavos al
      final y opera sobre expresiones cortas tecleadas por el usuario, no
      sobre sumas de cientos de transacciones — no es el mismo riesgo.
      **Probado** con el caso clásico de deriva de float (sumar 0.10 mil
      veces: float da `99.9999999999986`, centavos da `100` exacto) y con un
      balance de cuenta mixto (float: `2200.1200000000003`, centavos:
      `2200.12` exacto). `tsc --noEmit` limpio en `packages/core` y
      `apps/mobile`, `eslint .` sin errores.
- [x] No existe borrado de categorías en la UI (solo archivar), pero la DB sí
      tiene `on delete cascade` en `parent_id` — deuda latente si se agrega
      borrado en el futuro.
      **Resuelto: se construyó el borrado** (ver "Rediseños implementados").
- [x] `isCurrentMonth` en Home se congela al montar el componente — una sesión
      larga que cruce medianoche deja el botón "mes siguiente" deshabilitado un
      día de más.
      **Fix (2026-10-02):** `now = useMemo(() => new Date(), [])` (congelado
      para siempre al montar) eliminado. `selectedYear`/`selectedMonthIdx`
      ahora se siembran con inicializadores de `useState` (`() => new
      Date().getFullYear()` etc. — solo se leen una vez, como debe ser, para
      no resetear la navegación del usuario en cada render). `isCurrentMonth`
      se deriva del `today` que ya existía en el componente (`todayISODate()`,
      sin memoizar, ya se releía fresco en cada render) en vez de crear una
      fecha nueva — se recalcula solo, sin timers ni efectos nuevos. `tsc
      --noEmit` y `eslint .` limpios.

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

- [x] **Borrado real de categorías archivadas, con 5 condiciones (no solo las
      2 pedidas) porque toda FK hacia `categories` resuelve destructivamente
      al borrar (nunca `restrict`):**
      - `transactions.category_id` → `on delete set null` (descategorizaría
        historial en silencio).
      - `favorite_transactions.category_id` → `on delete set null`
        (rompería un favorito en silencio).
      - `budget_categories.category_id` → `on delete cascade` (encogería un
        presupuesto en silencio, podría dejarlo en 0 categorías).
      - `categories.parent_id` → `on delete cascade` (borrar un padre se
        lleva a sus hijos — cada uno re-chequeado por el mismo trigger, así
        que un hijo activo o en uso bloquea el borrado completo).
      - Las categorías "del sistema" (`slug` no nulo — ej. las de ajuste de
        saldo que `adjust-balance-sheet.tsx` busca por slug) nunca son
        borrables, tengan o no transacciones.
      **Regla final: solo se puede eliminar una categoría archivada que no
      sea del sistema, sin transacciones, sin estar en un favorito, y sin
      estar asignada a un presupuesto.** Si no, se bloquea con el motivo
      exacto.
      **Implementado (2026-10-02):** trigger `check_category_deletable`
      (migración `20261002200000_category_deletable.sql`) — probé las 5
      condiciones una por una contra la DB local, incluyendo el caso de
      cascada padre→hijo (borrar un padre cuyo hijo tiene una transacción
      falla completo, sin borrar nada). `deleteCategory` +
      `useDeleteCategory` en `packages/core`. UI en
      `categories/[id]/index.tsx`: toda categoría archivada muestra
      "Eliminar definitivamente"; si está bloqueada, se ve atenuada con el
      motivo exacto debajo (calculado client-side con los mismos datos ya
      cargados); si no, abre un confirm que además avisa cuántas
      subcategorías se eliminarían con ella. `errors.ts` traduce las 5
      razones a mensajes amigables por si la DB la atrapa primero.
      Verificado con `tsc --noEmit` en ambos paquetes.

## Backlog (pendiente — requiere pensar la estructura antes de tocar código)

- [x] **Texto engañoso al eliminar una meta ligada a cuenta.** El diálogo de
      `goals/[id]/index.tsx` dice "Solo se puede eliminar si no tiene
      aportaciones registradas", pero para una meta ligada eso es falso: sus
      aportaciones usan `to_account_id`, no `goal_id`, así que el
      `on delete restrict` nunca aplica — se puede eliminar siempre, con o sin
      historial, sin aviso real de que eso pasa.
      **Fix (2026-10-02):** el diálogo ahora distingue los dos casos. Meta
      ligada: "Se elimina la meta y su vínculo con '{cuenta}' — el dinero se
      queda intacto en esa cuenta, tenga o no aportaciones registradas." Meta
      virtual: sigue el texto original (sí aplica el `on delete restrict`
      ahí). `tsc --noEmit` y `eslint .` limpios.
- [ ] **Eliminar (no archivar) una cuenta ligada sin fondos no avisa** sobre la
      meta que se va a desvincular (el `on delete set null` de la DB lo
      resuelve sin corromper datos, pero `accounts/[id]/edit.tsx` no muestra
      ningún aviso, a diferencia del flujo de archivar que sí lo hace).

## Pendiente aparte (no es deficiencia, es trabajo en curso)

- [ ] **Push de las 14 migraciones a Supabase hosted** (`supabase db push`) —
      ninguna se ha subido todavía, independientemente de qué tan committeado
      esté el código localmente: `20261001120000_profile_travel_mode`,
      `20261001130000_profile_enabled_currencies`,
      `20261001140000_budget_goal_currency`,
      `20261001150000_transfer_currency_match`,
      `20261002120000_goal_linked_account`,
      `20261002130000_goal_account_unique`,
      `20261002140000_account_archive_zero_balance`,
      `20261002150000_account_archive_unlinks_goal`,
      `20261002160000_goal_is_completed`,
      `20261002170000_account_archive_respects_goal_completed`,
      `20261002180000_category_parent_type_and_archive_cascade`,
      `20261002190000_enabled_currencies_in_use`,
      `20261002200000_category_deletable`,
      `20261002210000_account_locked_fields`.
- [x] ~~Commitear los archivos modificados de la feature de multi-moneda +
      travel mode + meta-ligada-a-cuenta~~ — ya se hicieron 3 commits en
      paralelo (`135de98 Added trip mode. Added divisa switch in all viws`,
      `a4e8e37 Fixed bugs for objectives module`, `d60f2ea Fixed persisted
      bugs`), cubriendo todo hasta el borrado de categorías inclusive.
      **Queda sin commitear (trabajo de esta última tanda):** las 3
      migraciones más nuevas (`enabled_currencies_in_use`,
      `category_deletable`, `account_locked_fields`) y los archivos que
      tocaron — `preferences.tsx`, `currency-picker.tsx`,
      `categories/[id]/index.tsx`, `movement-form.tsx`,
      `validators/transaction.ts`, `budget-progress-bar.tsx` y los 5 call
      sites de `BudgetProgressBar`, `use-categories.ts`, `categories.ts`
      (supabase), `hooks/index.ts`, `errors.ts`, `utils/index.ts`
      (`hasCategories`), y este mismo `todo.md`.
