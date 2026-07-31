import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'server-integration',
    globals: true,
    environment: 'node',
    root: path.resolve(__dirname),
    include: ['tests/integration/**/*.test.js'],
    testTimeout: 60000,
    hookTimeout: 60000
  }
});
