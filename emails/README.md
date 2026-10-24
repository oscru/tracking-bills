# Correos

Plantillas de correo en el estilo de la app ("Lima + tinta"). El mapa de qué correos hacen
falta y en qué estado están vive en `docs/todo-mail-templates.md`.

```
pnpm emails:build     # genera los HTML
pnpm emails:preview   # genera y abre la galería (móvil/escritorio, claro/oscuro)
```

- `components.mjs` — layout base y componentes en **MJML**: `eyebrow`, `heading`, `paragraph`,
  `button` (la acción, una por correo), `linkFallback`, `codeBlock` (códigos), `amountCard`
  (montos), `steps`, `detailRows`, `note`.
- `locales/<idioma>/<grupo>.json` — los textos (asunto, preheader, pie y contenido), un archivo
  por grupo (`common`, `auth`, `peers`) en cada idioma (`es`, `en`). El build falla si al inglés
  le falta un texto que tiene el español.
- `templates.mjs` — la estructura de cada correo (qué componentes y en qué orden) y los datos
  de ejemplo para la vista previa.
- `build.mjs` — escribe:
  - `target: 'auth'` → `supabase/templates/<id>.html` con **los dos idiomas** en un solo archivo,
    y su asunto en `supabase/config.toml` (también generado: no lo edites a mano);
  - `target: 'app'` → `emails/dist/<idioma>/<id>.html` (para la Edge Function `send-email`,
    pendiente);
  - `emails/dist/preview.html` (galería, con selector de idioma).

## Idiomas

Supabase Auth solo acepta una plantilla por correo, así que las de autenticación llevan ambas
versiones y eligen con el metadato `language` del usuario:
`{{ if and .Data .Data.language (eq .Data.language "en") }}…inglés…{{ else }}…español…{{ end }}`.
La app lo guarda al registrarse y lo mantiene igual al idioma de la app (`syncAuthLanguage` en
`@repo/core`). Quien no lo tiene se registró cuando la app solo hablaba español, así que recibe
español.

## Compatibilidad

Se escribe en [MJML](https://mjml.io) y no en HTML a mano: MJML compila a lo que los clientes de
correo realmente renderizan (tablas anidadas, estilos inline, "tablas fantasma" para que Outlook
para Windows respete el ancho, botones que conservan su padding en Outlook, ajustes de DPI de
Office). El build usa validación estricta: una plantilla mal formada no compila.

La base (estilos inline, versión clara) funciona en todos lados. Encima, como mejora progresiva:

- **esquinas redondeadas y degradados**: Outlook para Windows los ignora (esquinas rectas, lima
  sólido); se sigue viendo bien;
- **modo oscuro y ajustes móviles** (`<mj-style>`): los clientes que quitan `<style>` (Gmail para
  cuentas que no son de Google, Outlook para Windows) muestran la versión clara.

Para revisar una plantilla contra la base de [caniemail.com](https://www.caniemail.com):
`npx doiuse-email` sobre el HTML generado. Antes de producción, mándate una prueba real a Gmail
(web y app), Outlook (Windows y web) y Apple Mail.

**No edites los HTML generados**: cambia `templates.mjs` o `components.mjs` y vuelve a generar.

Variables con sintaxis de Supabase (`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`,
`{{ .NewEmail }}`); los correos de la app usan la misma sintaxis (`{{ .InviterName }}`, …) para
que la Edge Function las llene igual.

En producción, las plantillas de autenticación se configuran en el dashboard de Supabase
(Authentication › Email Templates) pegando el HTML generado, o con `supabase config push`.
