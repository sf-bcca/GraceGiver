import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'src/vitest.frontend.config.ts',
      'server/vitest.config.js',
      'server/vitest.integration.config.js',
    ],
  },
});
