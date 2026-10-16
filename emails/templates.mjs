import {
  amountCard,
  button,
  codeBlock,
  detailRows,
  eyebrow,
  heading,
  linkFallback,
  note,
  paragraph,
  steps,
} from './components.mjs';

// Every email the app sends (see docs/todo-mail-templates.md for the map).
//
// - `target: 'auth'` → written to supabase/templates/<id>.html, sent by
//   Supabase Auth (register them in supabase/config.toml).
// - `target: 'app'`  → written to emails/dist/<id>.html, sent by the
//   `send-email` Edge Function (to build), which fills the same `{{ .Var }}`.
// `sample` fills the placeholders in the preview gallery only.

const SECURITY_NOTE =
  'Si no fuiste tú, ignora este correo: tu cuenta sigue segura y nadie puede entrar sin tu contraseña.';

export const templates = [
  // --- Auth (Supabase) -----------------------------------------------------------
  {
    id: 'confirmation',
    group: 'Autenticación',
    name: 'Confirmar registro',
    target: 'auth',
    subject: 'Confirma tu correo para empezar',
    preheader: 'Un paso más y tu cuenta queda lista.',
    footer: 'Recibes este correo porque alguien creó una cuenta de Genobills con esta dirección.',
    body: () =>
      [
        eyebrow('Bienvenido'),
        heading('Confirma tu correo'),
        paragraph(
          'Gracias por crear tu cuenta. Confirma que este correo es tuyo para empezar a llevar tus finanzas en orden.',
          { muted: true },
        ),
        button('Confirmar mi correo', '{{ .ConfirmationURL }}'),
        paragraph('O escribe este código en la app:', { muted: true, last: true }),
        codeBlock('{{ .Token }}', 'Vence en 1 hora'),
        linkFallback('{{ .ConfirmationURL }}'),
        note(SECURITY_NOTE),
      ].join('\n'),
    sample: {
      ConfirmationURL: 'https://genobills.app/auth/confirm?token=abc123',
      Token: '482915',
    },
  },
  {
    id: 'recovery',
    group: 'Autenticación',
    name: 'Restablecer contraseña',
    target: 'auth',
    subject: 'Tu código para restablecer tu contraseña',
    preheader: 'Escribe este código en la app para crear una contraseña nueva.',
    footer: 'Recibes este correo porque se pidió restablecer la contraseña de tu cuenta.',
    // Code, not link: the app's "¿Olvidaste tu contraseña?" screen asks for
    // it (apps/mobile/src/app/(auth)/forgot-password.tsx), so it works even
    // when the email is opened on another device.
    body: () =>
      [
        eyebrow('Seguridad'),
        heading('Restablece tu contraseña'),
        paragraph(
          'Recibimos una solicitud para cambiar la contraseña de <strong>{{ .Email }}</strong>. Escribe este código en la app para crear una nueva:',
          { muted: true, last: true },
        ),
        codeBlock('{{ .Token }}', 'Vence en 1 hora · solo se puede usar una vez'),
        note(SECURITY_NOTE),
      ].join('\n'),
    sample: {
      Email: 'oscar@ejemplo.com',
      Token: '482915',
    },
  },
  {
    id: 'email_change',
    group: 'Autenticación',
    name: 'Cambio de correo',
    target: 'auth',
    subject: 'Confirma tu nuevo correo',
    preheader: 'Confirma el cambio para empezar a usar tu nuevo correo.',
    footer: 'Recibes este correo porque se pidió cambiar el correo de tu cuenta.',
    body: () =>
      [
        eyebrow('Tu cuenta'),
        heading('Confirma el cambio de correo'),
        paragraph('Pediste cambiar el correo con el que entras a Genobills:', {
          muted: true,
          last: true,
        }),
        detailRows([
          ['Correo actual', '{{ .Email }}'],
          ['Correo nuevo', '{{ .NewEmail }}'],
        ]),
        button('Confirmar cambio', '{{ .ConfirmationURL }}'),
        linkFallback('{{ .ConfirmationURL }}'),
        note(
          'Si no pediste este cambio, no confirmes y cambia tu contraseña desde la app: tu correo actual sigue activo.',
        ),
      ].join('\n'),
    sample: {
      Email: 'oscar@ejemplo.com',
      NewEmail: 'oscar.cruz@nuevo.com',
      ConfirmationURL: 'https://genobills.app/auth/email?token=abc123',
    },
  },
  {
    id: 'password_changed',
    group: 'Autenticación',
    name: 'Aviso: contraseña cambiada',
    target: 'auth',
    subject: 'Tu contraseña cambió',
    preheader: 'Te avisamos por seguridad.',
    footer: 'Este es un aviso de seguridad que se envía siempre que cambia tu contraseña.',
    body: () =>
      [
        eyebrow('Aviso de seguridad'),
        heading('Tu contraseña cambió'),
        paragraph(
          'La contraseña de <strong>{{ .Email }}</strong> se acaba de cambiar. Si fuiste tú, no tienes que hacer nada.',
          { muted: true, last: true },
        ),
        note(
          '¿No fuiste tú? Restablece tu contraseña desde la pantalla de inicio de sesión y escríbenos a soporte cuanto antes.',
        ),
      ].join('\n'),
    sample: { Email: 'oscar@ejemplo.com' },
  },

  // --- App (Edge Function) ---------------------------------------------------------
  {
    id: 'peer_invite',
    group: 'Personas',
    name: 'Invitación con código',
    target: 'app',
    subject: '{{ .InviterName }} te invitó a vincularse en Genobills',
    preheader: 'Pásense dinero sin que cuente como gasto ni ingreso.',
    footer: 'Recibes este correo porque {{ .InviterName }} te invitó desde Genobills.',
    body: () =>
      [
        eyebrow('Invitación'),
        heading('{{ .InviterName }} quiere vincularse contigo'),
        paragraph(
          'Al vincularse pueden pasarse dinero sin que cuente como gasto ni como ingreso: lo que te envíe llega directo a tu cuenta. Cada quien sigue llevando sus propias cuentas.',
          { muted: true, last: true },
        ),
        codeBlock('{{ .Code }}', 'Tu código vence el {{ .ExpiresAt }}'),
        button('Abrir en la app', '{{ .DeepLink }}'),
        paragraph('<strong>¿Aún no tienes la app?</strong>', { last: true }),
        steps([
          'Descarga Genobills y crea tu cuenta.',
          'Ve a <strong>Opciones › Personas › Tengo un código</strong>.',
          'Escribe el código y elige en qué cuenta quieres recibir.',
        ]),
        note('Si no conoces a {{ .InviterName }}, ignora este correo: el código vence solo.'),
      ].join('\n'),
    sample: {
      InviterName: 'Oscar',
      Code: 'K7P2QX',
      ExpiresAt: '21 oct 2026',
      DeepLink: 'genobills://settings/peers?code=K7P2QX',
    },
  },
  {
    id: 'peer_transfer_received',
    group: 'Personas',
    name: 'Transferencia recibida',
    target: 'app',
    subject: '{{ .SenderName }} te envió {{ .Amount }}',
    preheader: 'Ya está en tu cuenta. No cuenta como ingreso.',
    footer:
      'Recibes este correo porque activaste los avisos de transferencias recibidas. Puedes apagarlos en Opciones › Notificaciones.',
    body: () =>
      [
        eyebrow('Transferencia recibida'),
        heading('{{ .SenderName }} te envió dinero'),
        paragraph('Ya está en tu cuenta y no cuenta como ingreso en tu Análisis.', {
          muted: true,
          last: true,
        }),
        amountCard({
          label: 'Recibiste',
          amount: '{{ .Amount }}',
          rows: [
            ['De', '{{ .SenderName }}'],
            ['Llegó a', '{{ .AccountName }}'],
            ['Fecha', '{{ .Date }}'],
          ],
        }),
        button('Ver en la app', '{{ .DeepLink }}'),
      ].join('\n'),
    sample: {
      SenderName: 'Oscar',
      Amount: '$5,000.00',
      AccountName: 'Banco A',
      Date: '14 oct 2026',
      DeepLink: 'genobills://transactions/123',
    },
  },
];
