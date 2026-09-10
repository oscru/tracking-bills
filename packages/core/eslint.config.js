const baseConfig = require('@repo/config/eslint/base');

module.exports = [
  // Supabase-generated, not hand-maintained.
  { ignores: ['src/types/database.ts'] },
  ...baseConfig,
];
