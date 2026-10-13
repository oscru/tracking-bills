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
