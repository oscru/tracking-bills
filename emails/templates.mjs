import { readFileSync } from 'node:fs';

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
// - `target: 'app'`  → written to emails/dist/<lang>/<id>.html, sent by the
//   `send-email` Edge Function (to build), which fills the same `{{ .Var }}`.
// `sample` fills the placeholders in the preview gallery only.
//
// The texts live in locales/<lang>/<group>.json (common, auth, peers) — one
// file per group, the same set in every language. Each template here is only
// the structure: `body(t, common)` gets the email's texts in one language.

export const LANGS = ['es', 'en'];

const read = (lang, group) =>
  JSON.parse(readFileSync(new URL(`./locales/${lang}/${group}.json`, import.meta.url), 'utf8'));

/** Every language's texts: `TEXTS[lang].auth.recovery.subject`. */
export const TEXTS = Object.fromEntries(
  LANGS.map((lang) => [
    lang,
    { common: read(lang, 'common'), auth: read(lang, 'auth'), peers: read(lang, 'peers') },
  ]),
);

export const templates = [
  // --- Auth (Supabase) -----------------------------------------------------------
  {
    id: 'confirmation',
    group: 'auth',
    name: 'Confirmar registro',
    target: 'auth',
    body: (t, common) =>
      [
        eyebrow(t.eyebrow),
        heading(t.heading),
        paragraph(t.intro, { muted: true }),
        button(t.button, '{{ .ConfirmationURL }}'),
        paragraph(t.codeHint, { muted: true, last: true }),
        codeBlock('{{ .Token }}', t.codeCaption),
        linkFallback('{{ .ConfirmationURL }}', common.linkFallback),
        note(common.securityNote),
      ].join('\n'),
    sample: {
      ConfirmationURL: 'https://app.genobills.com/auth/confirm?token=abc123',
      Token: '482915',
    },
  },
  {
    id: 'recovery',
    group: 'auth',
    name: 'Restablecer contraseña',
    target: 'auth',
    // Code, not link: the app's "¿Olvidaste tu contraseña?" screen asks for
    // it (apps/mobile/src/app/(auth)/forgot-password.tsx), so it works even
    // when the email is opened on another device.
    body: (t, common) =>
      [
        eyebrow(t.eyebrow),
        heading(t.heading),
        paragraph(t.intro, { muted: true, last: true }),
        codeBlock('{{ .Token }}', t.codeCaption),
        note(common.securityNote),
      ].join('\n'),
    sample: {
      Email: 'oscar@ejemplo.com',
      Token: '482915',
    },
  },
  {
    id: 'email_change',
    group: 'auth',
    name: 'Cambio de correo',
    target: 'auth',
    body: (t, common) =>
      [
        eyebrow(t.eyebrow),
        heading(t.heading),
        paragraph(t.intro, { muted: true, last: true }),
        detailRows([
          [t.current, '{{ .Email }}'],
          [t.new, '{{ .NewEmail }}'],
        ]),
        button(t.button, '{{ .ConfirmationURL }}'),
        linkFallback('{{ .ConfirmationURL }}', common.linkFallback),
        note(t.note),
      ].join('\n'),
    sample: {
      Email: 'oscar@ejemplo.com',
      NewEmail: 'oscar.cruz@nuevo.com',
      ConfirmationURL: 'https://app.genobills.com/auth/email?token=abc123',
    },
  },
  {
    id: 'password_changed',
    group: 'auth',
    name: 'Aviso: contraseña cambiada',
    target: 'auth',
    body: (t) =>
      [
        eyebrow(t.eyebrow),
        heading(t.heading),
        paragraph(t.intro, { muted: true, last: true }),
        note(t.note),
      ].join('\n'),
    sample: { Email: 'oscar@ejemplo.com' },
  },

  // --- App (Edge Function) ---------------------------------------------------------
  {
    id: 'peer_invite',
    group: 'peers',
    name: 'Invitación con código',
    target: 'app',
    body: (t) =>
      [
        eyebrow(t.eyebrow),
        heading(t.heading),
        paragraph(t.intro, { muted: true, last: true }),
        codeBlock('{{ .Code }}', t.codeCaption),
        button(t.button, '{{ .DeepLink }}'),
        paragraph(`<strong>${t.noApp}</strong>`, { last: true }),
        steps(t.steps),
        note(t.note),
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
    group: 'peers',
    name: 'Transferencia recibida',
    target: 'app',
    body: (t) =>
      [
        eyebrow(t.eyebrow),
        heading(t.heading),
        paragraph(t.intro, { muted: true, last: true }),
        amountCard({
          label: t.label,
          amount: '{{ .Amount }}',
          rows: [
            [t.from, '{{ .SenderName }}'],
            [t.account, '{{ .AccountName }}'],
            [t.date, '{{ .Date }}'],
          ],
        }),
        button(t.button, '{{ .DeepLink }}'),
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

/** A template's texts in `lang` (subject, preheader, footer, and what its body uses). */
export const textsFor = (template, lang) => TEXTS[lang][template.group][template.id];

/**
 * Supabase Auth sends one template per email, so the auth ones carry both
 * languages and pick with the person's `language` user metadata — which the
 * app keeps in sync (`syncAuthLanguage` in @repo/core). Anyone without it
 * signed up before the app spoke English, so they get Spanish.
 */
export const byLanguage = (render) =>
  `{{ if and .Data .Data.language (eq .Data.language "en") }}${render('en')}{{ else }}${render('es')}{{ end }}`;
