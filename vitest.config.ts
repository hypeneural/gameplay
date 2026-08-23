import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@christmas-games/platform': fileURLToPath(
        new URL('./packages/platform/src/index.ts', import.meta.url),
      ),
      '@christmas-games/theme': fileURLToPath(
        new URL('./packages/theme/src/index.ts', import.meta.url),
      ),
      '@christmas-games/dev-smoke/definition': fileURLToPath(
        new URL('./packages/games/dev-smoke/src/definition.ts', import.meta.url),
      ),
      '@christmas-games/dev-smoke': fileURLToPath(
        new URL('./packages/games/dev-smoke/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: [
      'apps/**/src/**/*.test.ts',
      'packages/**/tests/**/*.test.ts',
      'tools/**/tests/**/*.test.ts',
    ],
    environment: 'node',
    coverage: { enabled: false },
  },
});
