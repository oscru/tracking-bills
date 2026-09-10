const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

/**
 * Shared flat ESLint config for UI-agnostic TypeScript packages.
 * @type {import('eslint').Linter.Config[]}
 */
module.exports = tseslint.config(
  { ignores: ['dist/**', '.turbo/**', '.expo/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // CommonJS tooling config files (eslint.config.js, *.config.js, …)
    files: ['**/*.js', '**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettier,
);
