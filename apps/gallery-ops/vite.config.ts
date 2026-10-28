import { defineConfig } from 'vite';

export default defineConfig({
  base: '/gestao/galerias/',
  server: { host: '127.0.0.1', port: 4178, strictPort: true },
  preview: { host: '127.0.0.1', port: 4178, strictPort: true },
  build: { target: 'es2024', outDir: 'dist', sourcemap: false },
});
