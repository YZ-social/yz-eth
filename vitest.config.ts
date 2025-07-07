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
  },
  esbuild: {
    target: 'es2020',
  },
})
