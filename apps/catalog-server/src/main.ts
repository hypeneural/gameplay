import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCatalogServer } from './CatalogServer.js';
import { createFilePreviewRepository } from './filePreviewRepository.js';
import { parsePublicOrigin } from './socialPreview.js';

const environment = process.env.NODE_ENV ?? 'development';
const allowHttpForLocalDevelopment = environment !== 'production';
const configuredOrigin = process.env.CATALOG_PUBLIC_ORIGIN ?? 'http://127.0.0.1:4180';
const publicOrigin = parsePublicOrigin(configuredOrigin, allowHttpForLocalDevelopment);
const releaseStage = resolveReleaseStage(environment, process.env.CATALOG_RELEASE_STAGE);
const defaultApplicationShellPath = fileURLToPath(
  new URL('../../play/dist/index.html', import.meta.url),
);
const applicationShellPath = resolve(
  process.env.CATALOG_APPLICATION_SHELL ?? defaultApplicationShellPath,
);
const previewConfigPath = process.env.CATALOG_SOCIAL_PREVIEW_FILE;
if (!previewConfigPath) {
  throw new Error('CATALOG_SOCIAL_PREVIEW_FILE é obrigatório e deve ficar fora da webroot.');
}

const server = createCatalogServer({
  publicOrigin,
  loadApplicationShell: () => readFile(applicationShellPath, 'utf8'),
  previews: createFilePreviewRepository(resolve(previewConfigPath)),
  audit: {
    async record(entry) {
      // A integração de auditoria só recebe decisão, versão e data. Nunca
      // envie token, pessoa, caminho de arquivo ou URL para esta fronteira.
      console.info(JSON.stringify({ event: 'social-preview-decision', ...entry }));
    },
  },
  clock: { now: () => new Date() },
  runtime: { releaseStage },
});

const port = parsePort(process.env.PORT ?? '4180');
server.listen(port, '127.0.0.1', () => {
  console.info(JSON.stringify({ event: 'catalog-started', port, releaseStage }));
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

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT deve ser uma porta TCP válida.');
  }
  return port;
}

function resolveReleaseStage(environmentName: string, value: string | undefined): string {
  if (environmentName !== 'production') return 'development';
  if (value === 'staging-demo') return value;
  throw new Error(
    'CATALOG_RELEASE_STAGE=staging-demo é obrigatório no build atual. O estágio pilot permanece bloqueado até a autoridade real de sessão/mídia estar implementada.',
  );
}
