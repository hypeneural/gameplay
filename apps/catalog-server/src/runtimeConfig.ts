import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePublicOrigin } from './socialPreview.js';

type CatalogReleaseStage = 'development' | 'staging-demo';

export interface CatalogRuntimeConfig {
  readonly releaseStage: CatalogReleaseStage;
  readonly publicOrigin: URL;
  readonly applicationShellPath: string;
  readonly previewConfigPath: string;
  readonly port: number;
  readonly host: string;
  readonly databasePath?: string;
  readonly storageDir?: string;
  readonly publisherApiSecret?: string;
  readonly serverSecret?: string;
  /** HTTPS CRM origin; never a URL containing customer data or query parameters. */
  readonly crmEligibilityOrigin?: string;
  readonly crmApiSecret?: string;
  readonly crmEndpointStyle?: 'eligibility' | 'laravel-detail';
  /** Explicit cutover; staging demos retain the legacy file adapter until approved. */
  readonly previewAuthority: 'file-demo' | 'sqlite';
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

  const publisherApiSecret = resolveSecret(
    environment.PUBLISHER_API_SECRET,
    environment.PUBLISHER_API_SECRET_FILE,
  );
  const serverSecret = resolveSecret(
    environment.CATALOG_SERVER_SECRET,
    environment.CATALOG_SERVER_SECRET_FILE,
  );
  const crmApiSecret = resolveSecret(
    environment.CATALOG_CRM_API_SECRET,
    environment.CATALOG_CRM_API_SECRET_FILE,
  );
  const crmEligibilityOrigin = environment.CATALOG_CRM_ELIGIBILITY_ORIGIN;
  if (crmEligibilityOrigin) {
    const crmUrl = new URL(crmEligibilityOrigin);
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(crmUrl.hostname);
    if (
      (crmUrl.protocol !== 'https:' && !(crmUrl.protocol === 'http:' && loopback)) ||
      crmUrl.username ||
      crmUrl.password ||
      crmUrl.search ||
      crmUrl.hash ||
      crmUrl.pathname !== '/'
    ) {
      throw new Error('CATALOG_CRM_ELIGIBILITY_ORIGIN_INVALID');
    }
  }
  if (Boolean(crmEligibilityOrigin) !== Boolean(crmApiSecret)) {
    throw new Error('CATALOG_CRM_CREDENTIALS_INCOMPLETE');
  }
  const crmEndpointStyle = environment.CATALOG_CRM_ENDPOINT_STYLE;
  if (
    crmEndpointStyle !== undefined &&
    crmEndpointStyle !== 'eligibility' &&
    crmEndpointStyle !== 'laravel-detail'
  ) {
    throw new Error('CATALOG_CRM_ENDPOINT_STYLE_INVALID');
  }
  const previewAuthority = environment.CATALOG_PREVIEW_AUTHORITY ?? 'file-demo';
  if (previewAuthority !== 'file-demo' && previewAuthority !== 'sqlite') {
    throw new Error('CATALOG_PREVIEW_AUTHORITY_INVALID');
  }
  if (
    previewAuthority === 'sqlite' &&
    (!environment.CATALOG_DATABASE_PATH || !publisherApiSecret || !serverSecret)
  ) {
    throw new Error('CATALOG_SQLITE_PREVIEW_REQUIRES_PERSISTENCE');
  }

  return {
    releaseStage,
    publicOrigin,
    applicationShellPath: resolve(configuredApplicationShell ?? defaultApplicationShellPath),
    previewConfigPath: resolve(previewConfigPath),
    port: parsePort(environment.PORT ?? '4180'),
    host: environment.HOST ?? '127.0.0.1',
    previewAuthority,
    ...(environment.CATALOG_DATABASE_PATH
      ? { databasePath: resolve(environment.CATALOG_DATABASE_PATH) }
      : {}),
    ...(environment.CATALOG_STORAGE_DIR
      ? { storageDir: resolve(environment.CATALOG_STORAGE_DIR) }
      : {}),
    ...(publisherApiSecret !== undefined ? { publisherApiSecret } : {}),
    ...(serverSecret !== undefined ? { serverSecret } : {}),
    ...(crmEligibilityOrigin ? { crmEligibilityOrigin } : {}),
    ...(crmApiSecret ? { crmApiSecret } : {}),
    ...(crmEndpointStyle ? { crmEndpointStyle } : {}),
  };
}

/** Enforces metadata-only isolation separately from staging-demo publication. */
export function assertPrivateMetadataReadOnlyConfiguration(
  runtime: CatalogRuntimeConfig,
  environment: NodeJS.ProcessEnv,
  readSecret: string | undefined,
): void {
  if (environment.CATALOG_PRIVATE_METADATA_READ_ONLY !== '1') return;
  if (
    !runtime.databasePath ||
    !runtime.serverSecret ||
    !readSecret ||
    readSecret === runtime.serverSecret ||
    runtime.publisherApiSecret ||
    runtime.previewAuthority !== 'file-demo' ||
    environment.CATALOG_CUSTOMER_PILOT_ENABLED === '1' ||
    environment.CATALOG_CUSTOMER_DATA_ALLOWED === '1'
  ) {
    throw new Error('CATALOG_PRIVATE_READ_ONLY_CONFIG_INVALID');
  }
}

function resolveSecret(directValue?: string, filePath?: string): string | undefined {
  if (directValue) return directValue;
  if (!filePath) return undefined;
  try {
    return readFileSync(resolve(filePath), 'utf-8').trim();
  } catch {
    return undefined;
  }
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
