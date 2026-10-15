# TODO — Plantillas de correo

Mapa de todos los correos que va a mandar la app: qué los dispara, quién los envía, qué
variables necesitan y en qué estado están. Se actualiza conforme aparezcan flujos nuevos.

Hoy **no se manda ningún correo propio**: la confirmación de correo está apagada
(`enable_confirmations = false` en `supabase/config.toml`) y no hay plantillas personalizadas.

## Infraestructura (antes de cualquier plantilla)

- [ ] **SMTP propio:** el correo por defecto de Supabase tiene un límite de envíos muy bajo y es
      solo para pruebas. Configurar un proveedor (p. ej. Resend o Postmark) en
      `[auth.email.smtp]` (local) y en el dashboard (producción), con un dominio propio
      verificado (SPF, DKIM, DMARC).
- [ ] **Remitente:** nombre "Finance Tracker" y una dirección `no-reply@` del dominio, con
      `reply-to` a un correo de soporte.
- [ ] **Layout base compartido** (un solo HTML que heredan todas las plantillas):
  - estilo "Lima + tinta": fondo `#F6F7F9`, tarjeta blanca, texto `#1A1D21`, botón lima
    `#B9F227` con texto tinta;
  - logo (de momento el emoji 💸, igual que la pantalla de carga);
  - pie con el motivo del correo y el enlace de soporte;
  - compatible con modo oscuro de los clientes de correo y con texto plano de respaldo.
- [ ] **Dos vías de envío:**
  - **Supabase Auth**: plantillas de autenticación en `supabase/templates/*.html`, registradas
    en `config.toml` (`[auth.email.template.*]` y `[auth.email.notification.*]`).
  - **Edge Function `send-email`**: correos propios de la app (personas, cuenta). La disparan
    RPCs o Database Webhooks y llama al API del proveedor. Las plantillas viven en el código de
    la función y reutilizan el layout base.
- [ ] **Deep links:** los botones abren la app con el esquema `financetracker://…` y tienen un
      enlace web de respaldo para quien aún no la tenga instalada.
- [ ] **Idioma:** todo en español (es-MX), con montos formateados con `formatCurrency` y fechas
      con `formatDate`.

## Autenticación (Supabase Auth)

| # | Plantilla | Dispara | Variables | Estado |
|---|---|---|---|---|
| A1 | **Confirmar registro** | `signUp` cuando se active `enable_confirmations` | `{{ .ConfirmationURL }}`, `{{ .Token }}` (código de 6 dígitos) | Pendiente: hoy la confirmación está apagada |
| A2 | **Restablecer contraseña** | `sendPasswordReset` (`packages/core/src/supabase/auth.ts`) | `{{ .ConfirmationURL }}` o `{{ .Token }}` | Pendiente: la función existe pero **no hay pantalla** de "Olvidé mi contraseña" ni de nueva contraseña |
| A3 | **Cambio de correo** | Editar correo en el perfil (`double_confirm_changes = true`, así que va al correo viejo y al nuevo) | `{{ .ConfirmationURL }}`, `{{ .NewEmail }}` | Pendiente: no hay flujo de cambio de correo en la app |
| A4 | **Reautenticación** | Cambiar contraseña si se activa `secure_password_change` | `{{ .Token }}` | Opcional |
| A5 | **Aviso: contraseña cambiada** | `[auth.email.notification.password_changed]` | correo, fecha | Pendiente (seguridad) |
| A6 | **Aviso: correo cambiado** | `[auth.email.notification.email_changed]` | correo anterior y nuevo | Pendiente (seguridad) |

Las plantillas de Magic Link e Invite user de Supabase **no aplican**: la app solo usa correo y
contraseña, y las invitaciones entre personas son propias (ver abajo).

## Cuenta

| # | Plantilla | Dispara | Variables | Estado |
|---|---|---|---|---|
| C1 | **Bienvenida** | Primer inicio de sesión tras registrarse | `full_name` | Opcional |
| C2 | **Cuenta eliminada** | `delete_own_account` (RPC en `20261004130000_delete_own_account_bypass_category_guard.sql`) | `full_name`, fecha | Pendiente. Hay que capturar el correo **antes** de borrar el usuario (p. ej. el RPC encola el envío) |

## Personas (transferencias entre usuarios vinculados)

Base: migración `20261014160000_peer_transfers.sql` y la pantalla Opciones › Personas.

| # | Plantilla | Dispara | Variables | Estado |
|---|---|---|---|---|
| P1 | **Invitación con código** | Nuevo: "Invitar por correo" en Personas (hoy el código solo se comparte con el menú del sistema, p. ej. WhatsApp) | `inviter_name`, `code` (6 caracteres), `expires_at` (7 días), deep link `financetracker://settings/peers?code=XXXXXX`, enlace de descarga | **Siguiente** |
| P2 | **Invitación aceptada** (para quien invitó) | `accept_peer_invite` | `inviter_name`, `invitee_name` | Pendiente |
| P3 | **Desvinculación** (para la otra persona) | `unlink_peer` | `peer_name`, quién desvinculó | Pendiente |
| P4 | **Transferencia recibida** | Se crea el espejo (`sync_peer_transaction`) | `sender_name`, monto y divisa, fecha, cuenta donde llegó | Opcional y **apagada por defecto**: ya existe la notificación en la app. Requiere un interruptor propio en Opciones › Notificaciones |

### P1 — detalle de la invitación con código

- **Asunto:** "{inviter_name} te invitó a vincularse en Finance Tracker"
- **Cuerpo:**
  - qué significa vincularse (pasarse dinero sin que cuente como gasto ni ingreso, y que cada
    quien conserve sus cuentas);
  - el **código grande** y su vencimiento;
  - botón "Abrir en la app" (deep link con el código);
  - pasos si aún no tiene cuenta: descargar la app → registrarse → Opciones › Personas →
    "Tengo un código".
- **Trabajo en la app y en el backend:**
  - [ ] Campo opcional de correo en "Invitar a alguien" (Personas).
  - [ ] RPC `send_peer_invite_email(email)` o una llamada a la Edge Function con el código
        vigente. No revelar si el correo ya tiene cuenta.
  - [ ] Límite de envíos por usuario (p. ej. 5 por día) contra spam.
  - [ ] Que la app abra Personas con el código precargado al recibir el deep link `?code=`.

## Resúmenes (dependen de la fase 3 de notificaciones en `docs/TODO.md`)

| # | Plantilla | Dispara | Variables | Estado |
|---|---|---|---|---|
| R1 | **Resumen mensual** | Cron el día 1 | totales del mes por divisa, top categorías, presupuestos excedidos (de las vistas `monthly_category_totals` y similares) | Idea |
| R2 | **Presupuesto excedido** | Igual que la notificación `budget-exceeded`, por correo | presupuesto, gastado, límite | Idea, con su interruptor propio |

## Checklist por plantilla

Cada plantilla nueva debe cumplir:
- [ ] Asunto en español y de menos de 60 caracteres.
- [ ] Usa el layout base, con versión en texto plano.
- [ ] Probada en Gmail (web y app), Apple Mail y Outlook, en modo claro y oscuro.
- [ ] Sin datos sensibles innecesarios: montos solo en P4 y R1/R2, y nunca saldos completos.
- [ ] Enlace para darse de baja en los correos opcionales (P4, R1, R2).
