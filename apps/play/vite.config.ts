import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { localTestMediaPlugin } from './vite.localTestMedia.js';

export default defineConfig({
  plugins: [localTestMediaPlugin()],
  server: {
    watch: {
      // Playwright writes visual evidence here during a suite. Those PNGs are
      // not application source; watching them causes a Vite full reload in the
      // following test and interrupts an otherwise healthy Phaser mount.
      ignored: ['**/docs/generated/evidence/**'],
    },
  },
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
      '@christmas-games/expresso-das-fotos/definition': fileURLToPath(
        new URL('../../packages/games/expresso-das-fotos/src/definition.ts', import.meta.url),
      ),
      '@christmas-games/expresso-das-fotos': fileURLToPath(
        new URL('../../packages/games/expresso-das-fotos/src/index.ts', import.meta.url),
      ),
      '@christmas-games/puzzle-swap/definition': fileURLToPath(
        new URL('../../packages/games/puzzle-swap/src/definition.ts', import.meta.url),
      ),
      '@christmas-games/puzzle-swap/asset-lab': fileURLToPath(
        new URL('../../packages/games/puzzle-swap/src/assets/assetLabCatalog.ts', import.meta.url),
      ),
      '@christmas-games/puzzle-swap/performance-lab': fileURLToPath(
        new URL(
          '../../packages/games/puzzle-swap/src/lab/PuzzlePerformanceScenario.ts',
          import.meta.url,
        ),
      ),
      '@christmas-games/puzzle-swap': fileURLToPath(
        new URL('../../packages/games/puzzle-swap/src/index.ts', import.meta.url),
      ),
      '@christmas-games/tic-tac-toe/definition': fileURLToPath(
        new URL('../../packages/games/tic-tac-toe/src/definition.ts', import.meta.url),
      ),
      '@christmas-games/tic-tac-toe': fileURLToPath(
        new URL('../../packages/games/tic-tac-toe/src/index.ts', import.meta.url),
      ),
      '@christmas-games/magic-photo/definition': fileURLToPath(
        new URL('../../packages/games/magic-photo/src/definition.ts', import.meta.url),
      ),
      '@christmas-games/magic-photo': fileURLToPath(
        new URL('../../packages/games/magic-photo/src/index.ts', import.meta.url),
      ),
      '@christmas-games/memory/definition': fileURLToPath(
        new URL('../../packages/games/memory/src/definition.ts', import.meta.url),
      ),
      '@christmas-games/memory': fileURLToPath(
        new URL('../../packages/games/memory/src/index.ts', import.meta.url),
      ),
      '@christmas-games/guirlanda-das-lembrancas/definition': fileURLToPath(
        new URL('../../packages/games/guirlanda-das-lembrancas/src/definition.ts', import.meta.url),
      ),
      '@christmas-games/guirlanda-das-lembrancas': fileURLToPath(
        new URL('../../packages/games/guirlanda-das-lembrancas/src/index.ts', import.meta.url),
      ),
      '@christmas-games/mosaico-em-queda/definition': fileURLToPath(
        new URL('../../packages/games/mosaico-em-queda/src/definition.ts', import.meta.url),
      ),
      '@christmas-games/mosaico-em-queda': fileURLToPath(
        new URL('../../packages/games/mosaico-em-queda/src/index.ts', import.meta.url),
      ),
      '@christmas-games/rena-das-lembrancas/definition': fileURLToPath(
        new URL('../../packages/games/rena-das-lembrancas/src/definition.ts', import.meta.url),
      ),
      '@christmas-games/rena-das-lembrancas': fileURLToPath(
        new URL('../../packages/games/rena-das-lembrancas/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    target: 'es2024',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser/')) {
            return 'phaser-vendor';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
        },
      },
    },
  },
});
