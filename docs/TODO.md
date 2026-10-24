# TODO

# Imprescindibles (antes de salir a producción)

## Correos — siguientes pasos

El diseño ya está hecho (MJML en `emails/`, ver `emails/README.md`; vista previa con
`pnpm -w emails:preview`). El mapa completo de plantillas está en `docs/todo-mail-templates.md`.
Pendiente, en orden:

1. [ ] **SMTP propio y dominio** (bloquea todo lo demás). Lo hace el dueño, es configuración:
   - [ ] Elegir proveedor (Resend o Postmark) y configurarlo en `[auth.email.smtp]` (local) y en
         el dashboard de Supabase (producción).
   - [ ] Dominio `genobills.com` verificado en el proveedor de correo, con SPF, DKIM y DMARC.
   - [ ] Remitente `no-reply@genobills.com` y buzón `soporte@genobills.com` reales (las
         plantillas ya usan `soporte@genobills.com`: `SUPPORT_EMAIL` en `emails/components.mjs`).
2. [ ] **Plantillas de Auth en producción:** `db push` solo sube migraciones; las plantillas de
       `config.toml` aplican solo en local. Pegar el HTML generado en el dashboard
       (Authentication › Email Templates) o usar `supabase config push` (sube todo el
       `config.toml` local: revisarlo antes).
3. [ ] **Flujos que faltan en la app:**
   - [x] "Olvidé mi contraseña" (2026-10-14): con **código** en vez de enlace,
         `(auth)/forgot-password.tsx` + `resetPasswordWithCode`. Probado de punta a punta en local
         (Mailpit). En producción depende del SMTP (paso 1) y de subir la plantilla (paso 2).
   - [ ] Confirmar registro: encender `enable_confirmations` cuando el SMTP funcione, y manejar
         en la app el caso "revisa tu correo".
   - [ ] Cambio de correo desde el perfil.
4. [ ] **Edge Function `send-email`** para los correos propios de la app: invitación con código
       (P1) y transferencia recibida (P4).
5. [ ] **Prueba en clientes reales:** Gmail (web y app), Outlook (Windows y web) y Apple Mail,
       en claro y oscuro.

Nota: en `config.toml`, el CLI resuelve `content_path` distinto por sección: las plantillas desde
la raíz (`./supabase/templates/…`) y las notificaciones desde `supabase/` (`./templates/…`).

## Inicio de sesión con Google y Apple (OAuth)

Los botones ya existen (`apps/mobile/src/features/auth/sso-buttons.tsx`) y el código del flujo
también (`use-oauth-sign-in.ts` + `startOAuthSignIn`/`completeOAuthSignIn` en
`packages/core/src/supabase/auth.ts`, PKCE con `expo-web-browser`), pero **ningún proveedor está
configurado**: Google no aparece en `supabase/config.toml` y Apple está en `enabled = false`.
Hoy tocar cualquiera de los dos falla.

1. [ ] **Google:** crear el cliente OAuth en Google Cloud (pantalla de consentimiento con la
       marca Genobills) y activarlo en Supabase (`[auth.external.google]` en local y en el
       dashboard en producción).
2. [ ] **Apple:** requiere cuenta de Apple Developer (Services ID, llave y Team ID). En iOS, Apple
       **exige** ofrecer "Iniciar sesión con Apple" si hay otro inicio social; conviene la versión
       nativa (`expo-apple-authentication` + `signInWithIdToken`) en lugar del navegador.
3. [ ] **URLs de redirección:** agregar `genobills://` (y `exp://…` para desarrollo) a
       `additional_redirect_urls`; hoy solo están las de `127.0.0.1:3000`. Revisar también
       `site_url` para producción.
4. [ ] **Perfil incompleto:** quien entra con Google o Apple no pasa por el registro, así que no
       tiene fecha de nacimiento ni género (y Apple a veces tampoco manda el nombre). Pedirlos en
       una pantalla de "completa tu perfil" al primer ingreso.
5. [ ] **Cuentas con el mismo correo:** decidir qué pasa si alguien se registró con contraseña y
       luego entra con Google con el mismo correo (Supabase las vincula si el correo está
       verificado; revisar con la confirmación de correo apagada).
6. [ ] **Probar** en Android, iOS y web (el flujo web usa redirección de página, no
       `openAuthSessionAsync`).

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

## Despliegue de la app web (Vercel)

El código ya está listo: `apps/mobile/vercel.json` (build, reescritura SPA, caché e
encabezados), `apps/mobile/public/` (plantilla `index.html`, manifiesto e íconos). Falta la
configuración, que hace el dueño:

1. [ ] Crear el proyecto en Vercel desde el repo con **Root Directory = `apps/mobile`** (Vercel
       detecta pnpm; `vercel.json` ya trae install y build).
2. [ ] Variables de entorno de producción en Vercel: `EXPO_PUBLIC_SUPABASE_URL` y
       `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. [ ] Dominio `app.genobills.com` en el proyecto de la app y `genobills.com` (+ `www`, que
       redirige al dominio sin `www`) en el de la landing.
4. [ ] Supabase › Authentication › URL Configuration: **Site URL** `https://app.genobills.com` y
       en **Redirect URLs** `https://app.genobills.com/**` (lo necesita el OAuth en web).
5. [ ] Aplicar las migraciones pendientes en producción (`pnpm supabase db push`) **antes** del
       primer despliegue: la web ya usa las vistas y funciones nuevas.

# Mejoras (se pueden lanzar como features después)

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
