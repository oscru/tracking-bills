module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // One import per lucide icon instead of the whole set (Metro doesn't
    // tree-shake) — see the plugin's comment.
    plugins: ['./babel-plugin-lucide-icons'],
  };
};
