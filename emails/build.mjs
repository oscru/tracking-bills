#!/usr/bin/env node
// Builds every email in templates.mjs:
//   auth → supabase/templates/<id>.html   (Supabase Auth reads these)
//   app  → emails/dist/<id>.html          (the send-email Edge Function will)
// plus emails/dist/preview.html — a gallery with sample data, mobile/desktop
// widths and light/dark, to review the designs in a browser.
//
//   node emails/build.mjs            # build
//   node emails/build.mjs --open     # build and open the preview

import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import mjml2html from 'mjml';

import { C, layout } from './components.mjs';
import { templates } from './templates.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const authDir = join(root, 'supabase', 'templates');
const distDir = join(here, 'dist');
mkdirSync(authDir, { recursive: true });
mkdirSync(distDir, { recursive: true });

/** MJML → email-client HTML. Strict validation: a malformed template fails the build. */
const render = (t, forPreview = false) => {
  const { html, errors } = mjml2html(
    layout({
      title: t.subject,
      preheader: t.preheader,
      content: t.body(),
      footer: t.footer,
      forPreview,
    }),
    // `fonts: {}`: no Google Fonts <link>/@import — the system font stack
    // is used as is (MJML would otherwise import Roboto, which many clients block).
    { validationLevel: 'strict', keepComments: false, fonts: {} },
  );
  if (errors.length) {
    throw new Error(`${t.id}: ${errors.map((e) => e.formattedMessage).join('\n')}`);
  }
  return html;
};

/** Fills `{{ .Var }}` with sample values (preview only). */
const fill = (html, sample) =>
  html.replace(/\{\{\s*\.(\w+)\s*\}\}/g, (m, key) => (key in sample ? sample[key] : m));

for (const t of templates) {
  const out = join(t.target === 'auth' ? authDir : distDir, `${t.id}.html`);
  writeFileSync(out, render(t));
  console.log(`✓ ${t.target.padEnd(4)} ${out.replace(`${root}/`, '')}`);
}

// --- preview gallery --------------------------------------------------------------

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const cards = templates
  .map((t) => {
    const html = escapeAttr(fill(render(t, true), t.sample));
    const subject = fill(t.subject, t.sample);
    return `<section class="tpl" data-id="${t.id}">
  <header>
    <span class="chip">${t.group}</span>
    <h2>${t.name}</h2>
    <p class="meta"><b>Asunto:</b> ${subject}<br><b>Archivo:</b> ${
      t.target === 'auth' ? `supabase/templates/${t.id}.html` : `emails/dist/${t.id}.html`
    }</p>
  </header>
  <div class="frame"><iframe title="${t.name}" srcdoc="${html}" loading="lazy"></iframe></div>
</section>`;
  })
  .join('\n');

writeFileSync(
  join(distDir, 'preview.html'),
  `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Correos · Genobills</title>
<style>
  :root { --bg: ${C.canvas}; --surface: ${C.surface}; --line: ${C.line}; --ink: ${C.ink}; --ink2: ${C.ink2}; --lime: ${C.lime}; --tint: ${C.limeTint}; --tint-ink: ${C.limeInk}; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .top { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; padding: 14px 24px; background: rgba(246,247,249,.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
  .top h1 { margin: 0; font-size: 17px; font-weight: 800; }
  .top h1 span { display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; margin-right: 8px; border-radius: 9px; background: linear-gradient(135deg, ${C.lime}, ${C.limeDeep}); }
  .controls { display: flex; gap: 8px; flex-wrap: wrap; }
  .seg { display: inline-flex; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 3px; }
  .seg button { border: 0; background: transparent; padding: 7px 12px; border-radius: 9px; font: 600 13px inherit; font-family: inherit; color: var(--ink2); cursor: pointer; }
  .seg button[aria-pressed="true"] { background: var(--ink); color: #fff; }
  main { display: grid; gap: 28px; padding: 28px 24px 60px; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); max-width: 1500px; margin: 0 auto; }
  body.desktop main { grid-template-columns: 1fr; max-width: 760px; }
  .tpl header { margin-bottom: 10px; }
  .chip { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: var(--tint-ink); background: var(--tint); padding: 4px 8px; border-radius: 999px; }
  .tpl h2 { margin: 8px 0 4px; font-size: 18px; }
  .meta { margin: 0; font-size: 12px; line-height: 18px; color: var(--ink2); }
  .frame { background: var(--surface); border: 1px solid var(--line); border-radius: 24px; padding: 10px; display: flex; justify-content: center; }
  iframe { border: 0; width: 375px; max-width: 100%; height: 760px; border-radius: 16px; background: #fff; }
  body.desktop iframe { width: 100%; }
  @media (max-width: 480px) { main { padding: 16px; grid-template-columns: 1fr; } .top { padding: 12px 16px; } }
</style>
</head>
<body>
<div class="top">
  <h1><span>💸</span>Correos de Genobills</h1>
  <div class="controls">
    <div class="seg" role="group" aria-label="Ancho">
      <button data-width="mobile" aria-pressed="true">Móvil</button>
      <button data-width="desktop" aria-pressed="false">Escritorio</button>
    </div>
    <div class="seg" role="group" aria-label="Tema">
      <button data-theme="light" aria-pressed="true">Claro</button>
      <button data-theme="dark" aria-pressed="false">Oscuro</button>
    </div>
  </div>
</div>
<main>
${cards}
</main>
<script>
  const frames = () => document.querySelectorAll('iframe');
  const press = (group, btn) => group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  document.querySelectorAll('[data-width]').forEach((b) => b.addEventListener('click', () => {
    press(b.parentElement, b);
    document.body.classList.toggle('desktop', b.dataset.width === 'desktop');
  }));
  let dark = false;
  const applyTheme = (f) => { try { f.contentDocument.documentElement.classList.toggle('preview-dark', dark); } catch {} };
  frames().forEach((f) => f.addEventListener('load', () => applyTheme(f)));
  document.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => {
    press(b.parentElement, b);
    dark = b.dataset.theme === 'dark';
    frames().forEach(applyTheme);
  }));
</script>
</body>
</html>
`,
);
console.log('✓ preview emails/dist/preview.html');

if (process.argv.includes('--open')) {
  execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [join(distDir, 'preview.html')]);
}
