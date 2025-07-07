import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    isolate: false,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        'public/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/test/**',
      ],
    },
  },
  esbuild: {
    target: 'es2020',
  },
})
