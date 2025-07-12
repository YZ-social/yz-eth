import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  root: 'public',
  base: process.env.NODE_ENV === 'production' ? '/yz-eth/' : '/',
  build: {
    outDir: '../dist/web',
    assetsDir: 'assets',
    copyPublicDir: true,
    rollupOptions: {
      // No external dependencies for web build
    },
  },
  server: {
    port: 3000,
    open: true,
    allowedHosts: ['dorado.ngrok.dev'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: [
      '@ethereumjs/vm',
      '@ethereumjs/evm',
      '@ethereumjs/util',
      '@ethereumjs/common',
      'solc',
    ],
    exclude: ['../src/solidityExecutor.ts', '../src/blockManager.ts'],
  },
  esbuild: {
    target: 'es2022',
  },
  define: {
    global: 'globalThis',
  },
})
