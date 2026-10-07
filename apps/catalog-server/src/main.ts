import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createCatalogServer } from './CatalogServer.js';
import { createFilePreviewRepository, parsePreviewConfiguration } from './filePreviewRepository.js';
import { resolveCatalogRuntimeConfig } from './runtimeConfig.js';

const environment = process.env.NODE_ENV ?? 'development';
const defaultApplicationShellPath = fileURLToPath(
  new URL('../../play/dist/index.html', import.meta.url),
);
const runtime = resolveCatalogRuntimeConfig(environment, process.env, defaultApplicationShellPath);

const [applicationShell, previewSource] = await Promise.all([
  readFile(runtime.applicationShellPath, 'utf8'),
  readFile(runtime.previewConfigPath, 'utf8'),
]);
parsePreviewConfiguration(JSON.parse(previewSource), { rejectExampleTokens: environment === 'production' });

const server = createCatalogServer({
  publicOrigin: runtime.publicOrigin,
  loadApplicationShell: async () => applicationShell,
  previews: createFilePreviewRepository(runtime.previewConfigPath, {
    rejectExampleTokens: environment === 'production',
  }),
  audit: {
    async record(entry) {
      // A integração de auditoria só recebe decisão, versão e data. Nunca
      // envie token, pessoa, caminho de arquivo ou URL para esta fronteira.
      console.info(JSON.stringify({ event: 'social-preview-decision', ...entry }));
    },
  },
  clock: { now: () => new Date() },
  runtime: { releaseStage: runtime.releaseStage },
});

server.listen(runtime.port, '127.0.0.1', () => {
  console.info(
    JSON.stringify({
      event: 'catalog-started',
      port: runtime.port,
      releaseStage: runtime.releaseStage,
    }),
  );
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    const forcedExit = setTimeout(() => {
      process.exitCode = 1;
      process.exit();
    }, 10_000);
    forcedExit.unref();

    server.close((error) => {
      clearTimeout(forcedExit);
      if (error) {
        console.error(JSON.stringify({ event: 'catalog-stop-failed', signal }));
        process.exitCode = 1;
      } else {
        console.info(JSON.stringify({ event: 'catalog-stopped', signal }));
      }
    });
  });
}
