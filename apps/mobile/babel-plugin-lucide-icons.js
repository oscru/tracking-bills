/**
 * Rewrites `import { House, Pencil } from 'lucide-react-native'` into one
 * import per icon (`lucide-react-native/icons/house`, …).
 *
 * Metro doesn't tree-shake: importing from the package root pulls in all
 * ~1,900 icons (≈1.7 MB of the web bundle) even though the app uses a few
 * dozen. Per-icon subpaths are part of lucide's public `exports` map.
 *
 * The name → file map (aliases included: `Home`, `HomeIcon`, `LucideHome` →
 * `house`) is read from lucide's own index, so it stays right when the
 * package is upgraded. Anything that isn't an icon (`createLucideIcon`,
 * `Icon`, `LucideProvider`, type-only imports such as `LucideIcon`) is left
 * on the root import untouched.
 */
const fs = require('fs');
const path = require('path');

const PACKAGE = 'lucide-react-native';

function loadIconMap() {
  // The CJS entry lives in dist/cjs; the ESM index (with the alias lists) next to it.
  const cjsEntry = require.resolve(PACKAGE);
  const esmIndex = path.join(path.dirname(cjsEntry), '..', 'esm', 'lucide-react-native.mjs');
  const source = fs.readFileSync(esmIndex, 'utf8');
  const map = new Map();
  const line = /export \{([^}]+)\} from '\.\/icons\/([^']+)\.mjs';/g;
  let match;
  while ((match = line.exec(source))) {
    const file = match[2];
    for (const part of match[1].split(',')) {
      const name = /default as (\w+)/.exec(part)?.[1];
      if (name) map.set(name, file);
    }
  }
  return map;
}

let iconMap;

module.exports = function lucideIconsPlugin({ types: t }) {
  return {
    name: 'lucide-icons',
    visitor: {
      ImportDeclaration(nodePath) {
        const { node } = nodePath;
        if (node.source.value !== PACKAGE || node.importKind === 'type') return;
        iconMap ??= loadIconMap();

        const perIcon = [];
        const rest = [];
        for (const spec of node.specifiers) {
          const imported = t.isImportSpecifier(spec)
            ? t.isIdentifier(spec.imported)
              ? spec.imported.name
              : spec.imported.value
            : null;
          const file = imported && spec.importKind !== 'type' ? iconMap.get(imported) : undefined;
          if (file) {
            perIcon.push(
              t.importDeclaration(
                [t.importDefaultSpecifier(t.identifier(spec.local.name))],
                t.stringLiteral(`${PACKAGE}/icons/${file}`),
              ),
            );
          } else {
            rest.push(spec);
          }
        }
        if (perIcon.length === 0) return;

        if (rest.length > 0) {
          node.specifiers = rest;
          nodePath.insertAfter(perIcon);
        } else {
          nodePath.replaceWithMultiple(perIcon);
        }
      },
    },
  };
};
