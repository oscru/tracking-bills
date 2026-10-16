// Email building blocks in the app's "Lima + tinta" style, written in MJML.
//
// MJML compiles to the HTML email clients actually render: nested tables,
// inline styles, Outlook "ghost tables" (so the width holds in Outlook for
// Windows, which ignores max-width), VML/mso fallbacks for the button, and
// Office DPI settings. Hand-written HTML got those wrong; see emails/README.md.
//
// Progressive enhancement only on top of a baseline that works everywhere:
// - rounded corners and the lime gradient: dropped by Outlook for Windows
//   (square corners, solid lime) — still looks right;
// - dark mode and mobile tweaks live in <mj-style>: clients that strip
//   <style> (Gmail for non-Google accounts, Outlook for Windows) show the
//   light, inline-styled version, which is the baseline.
//
// Placeholders use Go-template syntax (`{{ .ConfirmationURL }}`) because
// that's what Supabase Auth renders; app emails use the same syntax.

export const C = {
  canvas: '#F6F7F9',
  surface: '#FFFFFF',
  line: '#EDEFF2',
  ink: '#1A1D21',
  ink2: '#6B7280',
  ink3: '#9CA3AF',
  lime: '#B9F227',
  limeDeep: '#8FD11A',
  limeInk: '#4D7C0F',
  limeTint: '#F2FBDC',
  // on the ink cards
  onInkMuted: '#9BA1A8',
  onInkLine: '#2A2F35',
  // dark mode
  canvasDark: '#0B0D0F',
  surfaceDark: '#16191D',
  lineDark: '#23272C',
  inkDark: '#F2F3F5',
  ink2Dark: '#9BA1A8',
  ink3Dark: '#6B7178',
  limeInkDark: '#A3E635',
  limeTintDark: '#1D2410',
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'SF Mono', SFMono-Regular, Menlo, Consolas, 'Courier New', monospace";

export const BRAND = 'Genobills';
/** Placeholder mark until there's a real logo (same as the app's launch screen). */
export const LOGO = '💸';
export const SUPPORT_EMAIL = 'soporte@genobills.app';

// --- dark mode -----------------------------------------------------------------
// Class hooks (`css-class` in MJML lands on wrapper divs; inner raw HTML
// carries the same classes on its own elements). Emitted under the media
// query, Outlook.com's `[data-ogsc]`, and `.preview-dark` (gallery only).
const DARK_RULES = `
  body, .bg-canvas, .bg-canvas > table, .bg-canvas > table > tbody > tr > td { background-color: ${C.canvasDark} !important; }
  .bg-surface, .bg-surface > table, .bg-surface > table > tbody > tr > td { background-color: ${C.surfaceDark} !important; border-color: ${C.lineDark} !important; }
  .t-ink, .t-ink div { color: ${C.inkDark} !important; }
  .t-ink2, .t-ink2 div { color: ${C.ink2Dark} !important; }
  .t-ink3, .t-ink3 div { color: ${C.ink3Dark} !important; }
  .t-link { color: ${C.limeInkDark} !important; }
  .b-line { border-color: ${C.lineDark} !important; }
  .bg-tint { background-color: ${C.limeTintDark} !important; color: ${C.limeInkDark} !important; }
  .t-tint, .t-tint div { color: ${C.limeInkDark} !important; }
`;

function scope(rules, prefix) {
  return rules.replace(
    /^(\s*)(.+?)\s*\{/gm,
    (_, indent, selectors) =>
      `${indent}${selectors
        .split(',')
        .map((sel) => `${prefix} ${sel.trim()}`)
        .join(', ')} {`,
  );
}

/** The whole email as MJML: head (preview text, styles), logo, card, footer. */
export function layout({ title, preheader, content, footer, forPreview = false }) {
  return `<mjml lang="es">
  <mj-head>
    <mj-title>${title}</mj-title>
    <mj-preview>${preheader}</mj-preview>
    <mj-attributes>
      <mj-all font-family="${FONT}" />
      <mj-text padding="0" color="${C.ink}" font-size="15px" line-height="24px" />
      <mj-section padding="0" />
      <mj-column padding="0" />
    </mj-attributes>
    <mj-style>
      a { text-decoration: none; }
      @media only screen and (max-width: 480px) {
        .card > table > tbody > tr > td { padding: 28px 22px !important; }
        .h1 div { font-size: 22px !important; line-height: 28px !important; }
        .code { font-size: 30px !important; letter-spacing: 8px !important; }
        .amount { font-size: 34px !important; line-height: 40px !important; }
        .btn-full table { width: 100% !important; }
      }
      @media (prefers-color-scheme: dark) {
${DARK_RULES}
      }
${scope(DARK_RULES, '[data-ogsc]')}
${forPreview ? scope(DARK_RULES, '.preview-dark') : ''}
    </mj-style>
    <mj-raw>
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
    </mj-raw>
  </mj-head>
  <mj-body background-color="${C.canvas}" width="560px" css-class="bg-canvas">
    <mj-section padding="32px 16px 18px">
      <mj-column>
        <mj-text>${brandHeader()}</mj-text>
      </mj-column>
    </mj-section>
    <mj-wrapper padding="0 12px">
      <mj-section background-color="${C.surface}" border="1px solid ${C.line}" border-radius="20px" padding="36px 32px" css-class="bg-surface card">
        <mj-column>
${content}
        </mj-column>
      </mj-section>
    </mj-wrapper>
    <mj-section padding="22px 20px 36px">
      <mj-column>
        <mj-text css-class="t-ink3" color="${C.ink3}" font-size="12px" line-height="18px" padding="0 0 8px">${footer}</mj-text>
        <mj-text css-class="t-ink3" color="${C.ink3}" font-size="12px" line-height="18px">¿Dudas? Escríbenos a <a class="t-link" href="mailto:${SUPPORT_EMAIL}" style="color:${C.limeInk};font-weight:600;">${SUPPORT_EMAIL}</a><br>© ${BRAND}</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
}

function brandHeader() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
  <td width="36" height="36" align="center" valign="middle" bgcolor="${C.lime}" style="width:36px;height:36px;border-radius:11px;background-color:${C.lime};background-image:linear-gradient(135deg, ${C.lime}, ${C.limeDeep});font-size:18px;line-height:36px;mso-line-height-rule:exactly;">${LOGO}</td>
  <td class="t-ink" style="padding-left:10px;font-family:${FONT};font-size:16px;font-weight:800;color:${C.ink};">${BRAND}</td>
</tr></table>`;
}

// --- content components (each returns MJML for inside the card's column) --------

/** Small uppercase label above the title — what kind of email this is. */
export function eyebrow(text) {
  return `<mj-text css-class="t-tint" color="${C.limeInk}" font-size="12px" line-height="16px" font-weight="700" letter-spacing="1px" padding="0 0 10px"><span style="text-transform:uppercase;">${text}</span></mj-text>`;
}

export function heading(text) {
  return `<mj-text css-class="t-ink h1" color="${C.ink}" font-size="26px" line-height="32px" font-weight="800" padding="0 0 12px"><h1 style="margin:0;font-size:inherit;line-height:inherit;font-weight:800;">${text}</h1></mj-text>`;
}

export function paragraph(html, { muted = false, last = false } = {}) {
  return `<mj-text css-class="${muted ? 't-ink2' : 't-ink'}" color="${muted ? C.ink2 : C.ink}" padding="0 0 ${last ? 0 : 16}px">${html}</mj-text>`;
}

/**
 * THE action of the email (one per email, like the app). `mj-button` is the
 * bulletproof kind: the whole box is clickable and keeps its padding in
 * Outlook. Full width on phones.
 */
export function button(label, href) {
  return `<mj-button href="${href}" background-color="${C.lime}" color="${C.ink}" font-size="15px" font-weight="800" border-radius="14px" inner-padding="15px 28px" padding="24px 0 8px" align="left" css-class="btn-full">${label}</mj-button>`;
}

/** Plain-link fallback under a button, for clients that mangle buttons. */
export function linkFallback(href) {
  return `<mj-text css-class="t-ink3" color="${C.ink3}" font-size="12px" line-height="18px" padding="12px 0 0">Si el botón no funciona, copia este enlace en tu navegador:<br><a class="t-link" href="${href}" style="color:${C.limeInk};word-break:break-all;">${href}</a></mj-text>`;
}

/** An ink card (Outlook-safe: a table cell with bgcolor; corners round elsewhere). */
function inkCard(inner, { padding = '26px 16px 22px', align = 'center', topBar = false } = {}) {
  const bar = topBar
    ? `<tr><td height="3" bgcolor="${C.lime}" style="height:3px;line-height:3px;font-size:0;mso-line-height-rule:exactly;border-radius:18px 18px 0 0;background-color:${C.lime};background-image:linear-gradient(90deg, ${C.lime}, ${C.limeDeep});">&nbsp;</td></tr>`
    : '';
  const radius = topBar ? '0 0 18px 18px' : '18px';
  return `<mj-text padding="24px 0 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">${bar}<tr><td align="${align}" bgcolor="${C.ink}" style="background-color:${C.ink};border-radius:${radius};padding:${padding};">${inner}</td></tr></table></mj-text>`;
}

/**
 * A code to type in (OTP, invite code) — the "number" of the email: an ink
 * card with the code in big lime monospace, like the app's hero cards.
 */
export function codeBlock(code, caption) {
  return inkCard(
    `<div class="code" style="font-family:${MONO};font-size:36px;line-height:44px;font-weight:700;letter-spacing:12px;color:${C.lime};">${code}</div>${
      caption
        ? `<div style="margin-top:8px;font-family:${FONT};font-size:12px;line-height:18px;color:${C.onInkMuted};">${caption}</div>`
        : ''
    }`,
  );
}

/** A money amount with a few detail rows (who, account, date) — ink card, lime hairline on top. */
export function amountCard({ label, amount, rows = [] }) {
  const rowsHtml = rows
    .map(
      ([k, v]) => `<tr>
  <td style="padding:10px 0 0;font-family:${FONT};font-size:13px;line-height:18px;color:${C.onInkMuted};">${k}</td>
  <td align="right" style="padding:10px 0 0;font-family:${FONT};font-size:13px;line-height:18px;font-weight:600;color:#F2F3F5;">${v}</td>
</tr>`,
    )
    .join('');
  return inkCard(
    `<div style="font-family:${FONT};font-size:13px;line-height:18px;color:${C.onInkMuted};">${label}</div>
<div class="amount" style="margin:4px 0 6px;font-family:${FONT};font-size:40px;line-height:46px;font-weight:800;letter-spacing:-1px;color:#FFFFFF;">${amount}</div>${
      rows.length
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.onInkLine};">${rowsHtml}</table>`
        : ''
    }`,
    { padding: '22px 22px 20px', align: 'left', topBar: true },
  );
}

/** Numbered steps — lime-tint number badges (table cells, not divs: Outlook-safe). */
export function steps(items) {
  const rows = items
    .map(
      (text, i) => `<tr>
  <td width="24" valign="top" style="padding:0 0 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="24" height="24" align="center" valign="middle" bgcolor="${C.limeTint}" class="bg-tint" style="width:24px;height:24px;border-radius:12px;background-color:${C.limeTint};color:${C.limeInk};font-family:${FONT};font-size:12px;font-weight:800;line-height:24px;mso-line-height-rule:exactly;">${i + 1}</td>
    </tr></table>
  </td>
  <td valign="top" class="t-ink" style="padding:2px 0 12px 10px;font-family:${FONT};font-size:14px;line-height:21px;color:${C.ink};">${text}</td>
</tr>`,
    )
    .join('');
  return `<mj-text padding="8px 0 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></mj-text>`;
}

/** A quiet aside — security notes, "si no fuiste tú…" — under a hairline. */
export function note(html) {
  return `<mj-divider border-width="1px" border-color="${C.line}" padding="24px 0 18px" css-class="b-line" />
<mj-text css-class="t-ink2" color="${C.ink2}" font-size="13px" line-height="20px">${html}</mj-text>`;
}

/** Label/value rows on the white card (e.g. old vs new email). */
export function detailRows(rows) {
  const body = rows
    .map(
      ([k, v], i) => `<tr>
  <td class="t-ink2 b-line" style="padding:12px 0;${i ? `border-top:1px solid ${C.line};` : ''}font-family:${FONT};font-size:14px;color:${C.ink2};">${k}</td>
  <td align="right" class="t-ink b-line" style="padding:12px 0;${i ? `border-top:1px solid ${C.line};` : ''}font-family:${FONT};font-size:14px;font-weight:600;color:${C.ink};">${v}</td>
</tr>`,
    )
    .join('');
  return `<mj-text padding="16px 0 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table></mj-text>`;
}
