import type { URL } from 'node:url';
import { resolve } from 'node:path';
import { parsePublicOrigin } from './socialPreview.js';

type CatalogReleaseStage = 'development' | 'staging-demo';

export interface CatalogRuntimeConfig {
  readonly releaseStage: CatalogReleaseStage;
  readonly publicOrigin: URL;
  readonly applicationShellPath: string;
  readonly previewConfigPath: string;
  readonly port: number;
}

export function resolveCatalogRuntimeConfig(
  environmentName: string,
  environment: NodeJS.ProcessEnv,
  defaultApplicationShellPath: string,
): CatalogRuntimeConfig {
  const production = environmentName === 'production';
  const releaseStage = resolveReleaseStage(production, environment.CATALOG_RELEASE_STAGE);
  const configuredOrigin = environment.CATALOG_PUBLIC_ORIGIN;
  if (production && !configuredOrigin) {
    throw new Error('CATALOG_PUBLIC_ORIGIN é obrigatório em produção.');
  }
  const publicOrigin = parsePublicOrigin(configuredOrigin ?? 'http://127.0.0.1:4180', !production);

  const previewConfigPath = environment.CATALOG_SOCIAL_PREVIEW_FILE;
  if (!previewConfigPath) {
    throw new Error('CATALOG_SOCIAL_PREVIEW_FILE é obrigatório e deve ficar fora da webroot.');
  }

  const configuredApplicationShell = environment.CATALOG_APPLICATION_SHELL;
  if (production && !configuredApplicationShell) {
    throw new Error('CATALOG_APPLICATION_SHELL é obrigatório em produção.');
  }

  return {
    releaseStage,
    publicOrigin,
    applicationShellPath: resolve(configuredApplicationShell ?? defaultApplicationShellPath),
    previewConfigPath: resolve(previewConfigPath),
    port: parsePort(environment.PORT ?? '4180'),
  };
}

function resolveReleaseStage(production: boolean, value: string | undefined): CatalogReleaseStage {
  if (!production) return 'development';
  if (value === 'staging-demo') return value;
  throw new Error(
    'CATALOG_RELEASE_STAGE=staging-demo é obrigatório no build atual. O estágio pilot permanece bloqueado até a autoridade real de sessão/mídia estar implementada.',
  );
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT deve ser uma porta TCP válida.');
  }
  return port;
}
