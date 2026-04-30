import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}', 'functions/**/*.{test,spec}.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules', 'dist', 'src/test'],
    },
  },
})
