# TODO

## Notificaciones — Fase 3: push desde servidor

Pospuesto el 2026-10-12. Las fases 1 (centro de notificaciones en la app) y 2
(notificaciones locales programadas con `expo-notifications`) ya están hechas.

### Por qué hace falta

Lo que la fase 2 no cubre, porque todo se calcula y programa en el propio teléfono:

- [ ] **Cambios desde otro dispositivo:** un gasto registrado en la web no dispara el aviso de
      presupuesto en el teléfono hasta abrir la app ahí.
- [ ] **Avisos ya resueltos:** un pago marcado como hecho desde la web sigue programado en el
      teléfono y se envía igual (solo se cancela al abrir la app en el teléfono).
- [ ] **Sin abrir la app más de 30 días:** se acaban los recordatorios programados (el horizonte
      de planeación es de 30 días).

### Alternativa barata (si no se hace la fase 3 completa)

- [ ] Forzar refetch de movimientos, presupuestos y metas al volver la app a primer plano
      (`AppState` → `active`), para que la re-sincronización cancele antes lo ya resuelto.

### Trabajo

1. [ ] **Separar el módulo de reglas** (`packages/core/src/notifications`) en código puro: hoy
       importa `utils`, que importa `utils/errors` → `supabase/client` → React Native. Debe poder
       importarse desde Deno (Edge Function) sin dependencias de RN.
2. [ ] **Tokens de push:** tabla `push_tokens` (`user_id`, `token`, `platform`, `device_id`,
       `updated_at`) con RLS. Registrar el token de Expo Push (`getExpoPushTokenAsync`, usa el
       `projectId` de EAS) al dar permiso; borrarlo al cerrar sesión.
3. [ ] **Edge Function con cron** (`pg_cron`, cada hora): evaluar las mismas reglas de
       `@repo/core/notifications` con los datos del servidor y enviar por Expo Push lo que toque a
       esa hora, según `notification_prefs.reminderHour` de cada usuario.
4. [ ] **Disparo por evento:** webhook de base de datos al insertar o actualizar `transactions`
       → evaluar presupuestos y metas de ese usuario → push inmediato (presupuesto al umbral o
       excedido, hitos y meta cumplida).
5. [ ] **Registro de envíos:** tabla `notification_deliveries` (`user_id`, `notification_id`,
       `sent_at`) para no repetir envíos; respetar `notification_reads` (no enviar lo ya leído o
       descartado).
6. [ ] **Evitar duplicados con la fase 2:** quitar la programación local de los tipos que pasen al
       servidor (dejar lo local solo como respaldo sin conexión, o eliminarlo).

### Requisitos externos

- [ ] **Android:** proyecto de Firebase (gratis) y credencial FCM v1 subida a EAS
      (`eas credentials`); recompilar el APK.
- [ ] **iOS:** cuenta de Apple Developer (USD 99/año) para las credenciales de APNs. Sin ella no
      hay push en iPhone (las notificaciones locales de la fase 2 sí funcionan).
- [ ] **Supabase:** activar `pg_cron` y desplegar la Edge Function.

Sugerencia de orden: empezar por Android (FCM) y dejar iOS para cuando exista la cuenta de Apple
Developer.

## Personas — Dividir gastos (pospuesto)

Pospuesto el 2026-10-14. Se apoya en las transferencias entre personas ya hechas
(`20261014160000_peer_transfers.sql`): cada persona vinculada es una cuenta oculta `contact`
cuyo saldo es el neto entre ustedes.

### Diseño acordado

Ejemplo: Oscar paga $1,000 del súper con su tarjeta, a medias con Ana.

| Ledger | Movimiento | Efecto |
|---|---|---|
| Oscar | Gasto $500 desde la tarjeta (Súper) | Su parte: cuenta como su gasto |
| Oscar | Transferencia $500 tarjeta → contacto "Ana" | Lo que pagó por ella: es lo que Ana le debe, no un gasto |
| Ana (lo crea la BD) | Gasto $500 desde su contacto "Oscar" | Su parte: cuenta como su gasto y deja "le debo $500" sin tocar sus cuentas reales |

- La tarjeta de Oscar baja $1,000. El Análisis de cada uno cuenta $500. Saldos, vistas de
  resúmenes y Análisis **no cambian**: todo son gastos y transferencias normales.
- Saldar = la transferencia entre personas que ya existe, que deja el contacto en $0.
- No hay barrera de divisa: la parte de Ana va a su contacto, así que no necesita cuenta para recibir.

### Trabajo

1. [ ] Tabla `splits` (`payer_id`, `peer_id`, `total`, `payer_share`, `currency`) y columna
       `split_id` en `transactions`. RPCs `record_split_expense`, `update_split_expense` y
       `delete_split_expense`, que crean y sincronizan las tres filas.
2. [ ] `sync_peer_transaction` debe **ignorar** las transferencias con `split_id`, porque la
       RPC crea el espejo como gasto, no como transferencia.
3. [ ] Categoría del espejo: la misma por `slug` si es del sistema; si no, `null`. Ana puede
       cambiar categoría y descripción de su copia; monto, fecha y estado vienen de quien pagó
       (ajustar `check_peer_transaction`).
4. [ ] Formulario de gasto: fila "Dividir con…" (persona y parte: a medias, monto o %).
5. [ ] Movimientos: **una sola fila** ("Súper · −$500 · pagaste $1,000, dividido con Ana") y la
       transferencia interna oculta en las listas, pero contando en los saldos. Desglose en el detalle.
6. [ ] Personas: "Ana te debe $X" / "Le debes $X" y botón "Saldar" que abre la transferencia
       ya llenada.
7. [ ] Notificación para la otra persona: "Oscar dividió Súper contigo: te toca $500".
8. [ ] Primera versión: una persona por gasto (parejas). Dividir entre 3 o más, después.

## Personas — cabos sueltos menores

- [ ] El nombre de la cuenta de contacto se toma al vincularse; no se actualiza si la otra
      persona cambia su nombre.
- [ ] Favoritos con una persona como destino: no se pueden crear desde la pantalla de
      Favoritos, y quedan rotos sin aviso si se desvinculan.
- [ ] Importar/exportar: los envíos se exportan como transferencias a una cuenta "Ana" y al
      importarse se crea una cuenta normal (se pierde el vínculo).
- [ ] No se puede rechazar una transferencia recibida (solo devolverla).
- [ ] Límite de intentos al canjear códigos de invitación (`accept_peer_invite`).
