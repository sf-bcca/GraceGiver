import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['tests/integration/**'], // Unit tests exclude integration
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
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.js'],
    testTimeout: 60000, // Longer timeout for API calls
    hookTimeout: 60000
  }
});
