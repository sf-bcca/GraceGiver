import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'server-unit',
    globals: true,
    environment: 'node',
    root: path.resolve(__dirname),
    include: ['tests/**/*.test.js'],
    exclude: ['tests/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['*.js'],
      exclude: ['node_modules', 'tests', 'index.js']
    },
    testTimeout: 10000
  }
});

// Integration test config (used via --config flag)
export const integrationConfig = defineConfig({
  test: {
    name: 'server-integration',
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.js'],
    testTimeout: 60000,
    hookTimeout: 60000
  }
});
