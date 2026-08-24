import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { localTestMediaPlugin } from './vite.localTestMedia.js';

export default defineConfig({
  plugins: [localTestMediaPlugin()],
  resolve: {
    alias: {
      '@christmas-games/platform': fileURLToPath(
        new URL('../../packages/platform/src/index.ts', import.meta.url),
      ),
      '@christmas-games/theme': fileURLToPath(
        new URL('../../packages/theme/src/index.ts', import.meta.url),
      ),
      '@christmas-games/dev-smoke/definition': fileURLToPath(
        new URL('../../packages/games/dev-smoke/src/definition.ts', import.meta.url),
      ),
      '@christmas-games/dev-smoke': fileURLToPath(
        new URL('../../packages/games/dev-smoke/src/index.ts', import.meta.url),
      ),
      '@christmas-games/puzzle-swap/definition': fileURLToPath(
        new URL('../../packages/games/puzzle-swap/src/definition.ts', import.meta.url),
      ),
      '@christmas-games/puzzle-swap': fileURLToPath(
        new URL('../../packages/games/puzzle-swap/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    target: 'es2024',
    sourcemap: true,
  },
});
