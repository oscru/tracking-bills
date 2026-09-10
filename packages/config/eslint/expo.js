const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

/**
 * Shared flat ESLint config for the Expo universal app.
 * @type {import('eslint').Linter.Config[]}
 */
module.exports = [
  ...expoConfig,
  prettier,
  {
    ignores: ['dist/**', '.expo/**', 'expo-env.d.ts', 'nativewind-env.d.ts'],
  },
];
