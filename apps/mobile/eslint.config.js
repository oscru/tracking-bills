// https://docs.expo.dev/guides/using-eslint/
const i18next = require('eslint-plugin-i18next');

const expoConfig = require('@repo/config/eslint/expo');

module.exports = [
  ...expoConfig,
  // Every text a person reads comes from the translations
  // (packages/core/src/i18n/locales/<lang>/<feature>.json) — not written in
  // the screen. Flags text between JSX tags and prose in the props that show
  // it (label, title, placeholder…).
  {
    files: ['src/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            include: [
              'label',
              'title',
              'placeholder',
              'description',
              'subtitle',
              'body',
              'message',
              'accessibilityLabel',
              'accessibilityHint',
              'confirmLabel',
              'cancelLabel',
              'submitLabel',
              'createLabel',
              'searchPlaceholder',
              'allLabel',
            ],
          },
          words: {
            exclude: [
              // Brand names, symbols and single letters (the logo's "G").
              '^(Genobills|Google|Apple|[A-Z])$',
              '^[^A-Za-zÁÉÍÓÚáéíóúñÑ]+$',
              // Not prose: currency codes, identifiers, NativeWind class lists.
              '^[A-Z]{3}$',
              '^[a-z][A-Za-z0-9_-]*$',
              '^[a-z0-9:/\\[\\]#.%-]+( [a-z0-9:/\\[\\]#.%-]+)*$',
            ],
          },
        },
      ],
    },
  },
];
