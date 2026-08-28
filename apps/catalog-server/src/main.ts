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
});

const port = parsePort(process.env.PORT ?? '4180');
server.listen(port, '127.0.0.1', () => {
  console.info(`Servidor de catálogo ouvindo em http://127.0.0.1:${port}`);
});

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT deve ser uma porta TCP válida.');
  }
  return port;
}
