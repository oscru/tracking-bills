// Regenerates src/i18n/resources.ts from the feature files in src/i18n/locales.
// Run after adding (or removing) a feature file: `pnpm --filter @repo/core gen:i18n`.
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const i18nDir = join(dirname(fileURLToPath(import.meta.url)), '../src/i18n');
const list = (lang) =>
  readdirSync(join(i18nDir, 'locales', lang))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .sort();

const namespaces = list('es');
const english = list('en');
const missing = namespaces.filter((ns) => !english.includes(ns));
const extra = english.filter((ns) => !namespaces.includes(ns));
if (missing.length || extra.length) {
  throw new Error(
    `es/ and en/ must have the same files — missing in en: ${missing}, only in en: ${extra}`,
  );
}

const ident = (lang, ns) =>
  lang +
  ns.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase());
const imports = ['en', 'es']
  .flatMap((lang) =>
    namespaces.map((ns) => `import ${ident(lang, ns)} from './locales/${lang}/${ns}.json';`),
  )
  .join('\n');
const order = ['common', ...namespaces.filter((ns) => ns !== 'common')];
const entries = (lang) => order.map((ns) => `  ${ns}: ${ident(lang, ns)},`).join('\n');

writeFileSync(
  join(i18nDir, 'resources.ts'),
  `// Generated from the files in ./locales by scripts/gen-i18n-resources.mjs — don't edit by hand.
${imports}

/**
 * Every language's texts, one namespace per feature (\`locales/<lang>/<feature>.json\`).
 * A new feature file goes in both languages, then \`pnpm --filter @repo/core gen:i18n\`;
 * \`satisfies\` makes English fail to typecheck if it misses a key Spanish has.
 */
const es = {
${entries('es')}
};

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

const en = {
${entries('en')}
} satisfies Shape<typeof es>;

export const resources = { es, en };
`,
);
console.log(`resources.ts: ${namespaces.length} namespaces`);
