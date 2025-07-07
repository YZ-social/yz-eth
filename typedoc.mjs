export default {
  entryPoints: ['src/index.ts'],
  out: 'docs',
  exclude: ['**/*.spec.ts', '**/*.test.ts', '**/test/**'],
  theme: 'markdown',
  readme: 'README.md',
  excludePrivate: true,
  excludeProtected: true,
  excludeExternals: true,
  plugin: ['typedoc-plugin-markdown'],
}
