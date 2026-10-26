import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createCatalogServer } from './CatalogServer.js';
import { createFilePreviewRepository, parsePreviewConfiguration } from './filePreviewRepository.js';
import type { SocialPreviewRepository } from './socialPreview.js';
import { SqlitePreviewRepository } from './publication/sqlitePreviewRepository.js';
import { CrmClientError, HttpCrmClient } from './crm/CrmEligibilityService.js';
import type { CrmClient } from './crm/CrmEligibilityService.js';
import { resolveCatalogRuntimeConfig } from './runtimeConfig.js';
import { PublicationService } from './publication/PublicationService.js';
import { GameplayStatusLookup } from './publication/GameplayStatusLookup.js';
import { SqliteSessionRepository } from './publication/SessionRepository.js';
import { applyMigrations, openSqliteDatabase } from './publication/sqliteDatabase.js';
import { StructuredPublicationLogger } from './publication/publicationLogger.js';
import { FileSystemStorageService } from './storage/FileSystemStorageService.js';

const environment = process.env.NODE_ENV ?? 'development';
const defaultApplicationShellPath = fileURLToPath(
  new URL('../../play/dist/index.html', import.meta.url),
);
const runtime = resolveCatalogRuntimeConfig(environment, process.env, defaultApplicationShellPath);

const applicationShell = await readFile(runtime.applicationShellPath, 'utf8');
if (runtime.previewAuthority === 'file-demo') {
  const previewSource = await readFile(runtime.previewConfigPath, 'utf8');
  parsePreviewConfiguration(JSON.parse(previewSource), {
    rejectExampleTokens: environment === 'production',
  });
}

let publicationService: PublicationService | undefined;
let gameplayStatusLookup: GameplayStatusLookup | undefined;
let sessionIsActive: ((token: string) => Promise<boolean>) | undefined;
let previews: SocialPreviewRepository = createFilePreviewRepository(runtime.previewConfigPath, {
  rejectExampleTokens: environment === 'production',
});
let readinessDatabase: ReturnType<typeof openSqliteDatabase> | undefined;

if (runtime.databasePath && runtime.publisherApiSecret) {
  if (!runtime.serverSecret) {
    throw new Error('CATALOG_SERVER_SECRET_MISSING');
  }
  const db = openSqliteDatabase(runtime.databasePath);
  applyMigrations(db);
  readinessDatabase = db;
  const sessionRepository = new SqliteSessionRepository({
    db,
    serverSecret: runtime.serverSecret,
    publicBaseUrl: runtime.publicOrigin.origin,
  });
  sessionIsActive = async (token) => sessionRepository.isSessionActive(token);
  const readSecret = process.env.CATALOG_INTERNAL_READ_SECRET;
  if (
    readSecret &&
    (readSecret === runtime.publisherApiSecret || readSecret === runtime.serverSecret)
  )
    throw new Error('CATALOG_READ_SECRET_MUST_BE_DISTINCT');
  if (readSecret)
    gameplayStatusLookup = new GameplayStatusLookup({
      db,
      publicOrigin: runtime.publicOrigin,
      sessionSecret: runtime.serverSecret,
      readSecret,
    });
  if (runtime.previewAuthority === 'sqlite') {
    previews = new SqlitePreviewRepository({ db });
  }

  // In persistent mode a missing CRM connection must deny session resolution.
  // Staging HTML/OG remains accessible, but no unknown customer UUID is accepted.
  const crmClient: CrmClient =
    runtime.crmEligibilityOrigin && runtime.crmApiSecret
      ? new HttpCrmClient({
          crmEndpointUrl: runtime.crmEligibilityOrigin,
          apiSecret: runtime.crmApiSecret,
          ...(runtime.crmEndpointStyle ? { endpointStyle: runtime.crmEndpointStyle } : {}),
        })
      : {
          async verifyEligibility() {
            throw new CrmClientError('CRM_ELIGIBILITY_NOT_CONFIGURED', true);
          },
        };
  const storageService = new FileSystemStorageService({
    storageDir: runtime.storageDir ?? './data/media',
  });
  const logger = new StructuredPublicationLogger();
  // Customer publication is a separate authorization from CRM eligibility.
  // staging-demo never permits arbitrary order UUIDs, even with a valid
  // publisher secret. Only an explicitly configured, single-order pilot
  // can publish while broader production-stage gates remain unavailable.
  const pilotOrderUuid = process.env.CATALOG_PILOT_ORDER_UUID?.trim().toLowerCase();
  const pilotEnabled =
    runtime.releaseStage === 'staging-demo' &&
    process.env.CATALOG_CUSTOMER_PILOT_ENABLED === '1' &&
    process.env.CATALOG_CUSTOMER_DATA_ALLOWED === '1' &&
    Boolean(
      pilotOrderUuid &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        pilotOrderUuid,
      ),
    );
  publicationService = new PublicationService({
    sessionRepository,
    storageService,
    publisherSecret: runtime.publisherApiSecret,
    crmClient,
    isOrderAllowedForPublication: (orderUuid) =>
      pilotEnabled && orderUuid.toLowerCase() === pilotOrderUuid,
    logger,
    publicBaseUrl: runtime.publicOrigin.origin,
  });
}

if (process.env.CATALOG_INTERNAL_READ_SECRET && !gameplayStatusLookup)
  throw new Error('CATALOG_READ_API_REQUIRES_ACTIVE_SQLITE');

const server = createCatalogServer({
  publicOrigin: runtime.publicOrigin,
  loadApplicationShell: async () => applicationShell,
  previews,
  audit: {
    async record(entry) {
      // A integração de auditoria só recebe decisão, versão e data. Nunca
      // envie token, pessoa, caminho de arquivo ou URL para esta fronteira.
      console.info(JSON.stringify({ event: 'social-preview-decision', ...entry }));
    },
  },
  clock: { now: () => new Date() },
  runtime: { releaseStage: runtime.releaseStage },
  readiness: async () => {
    if (runtime.previewAuthority === 'sqlite') {
      // Lightweight indexed DB connection health; no customer rows are logged.
      const check = readinessDatabase?.prepare('SELECT 1 AS ok').get() as
        { ok?: number } | undefined;
      if (check?.ok !== 1) throw new Error('CATALOG_SQLITE_UNAVAILABLE');
      return;
    }
    const currentSource = await readFile(runtime.previewConfigPath, 'utf8');
    parsePreviewConfiguration(JSON.parse(currentSource), {
      rejectExampleTokens: environment === 'production',
    });
  },
  ...(publicationService ? { publicationService } : {}),
  ...(gameplayStatusLookup ? { gameplayStatusLookup } : {}),
  ...(sessionIsActive ? { sessionIsActive } : {}),
});

server.listen(runtime.port, runtime.host, () => {
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
