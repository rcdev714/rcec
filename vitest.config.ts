import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: [
      'tests/e2e/**/*',
      'node_modules/**/*',
      '.next/**/*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '.next/',
        'coverage/',
        '**/*.d.ts',
        'next.config.ts',
        'tailwind.config.ts',
        'postcss.config.mjs'
      ]
    },
    testTimeout: 30000,
    bail: process.env.CI ? 1 : 0,
    reporters: process.env.CI ? ['verbose'] : ['default']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
