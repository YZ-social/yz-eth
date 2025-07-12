import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
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
    setupFiles: ['./test/setup-browser.ts'],
  },
  esbuild: {
    target: 'es2020',
  },
})
