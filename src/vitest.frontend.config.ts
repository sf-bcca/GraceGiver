import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  test: {
    name: 'frontend',
    globals: true,
    environment: 'jsdom',
    env: { NODE_ENV: 'development' },
    setupFiles: [path.resolve(__dirname, 'test/setup.ts')],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})

