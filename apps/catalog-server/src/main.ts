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
  publicationService = new PublicationService({
    sessionRepository,
    storageService,
    publisherSecret: runtime.publisherApiSecret,
    crmClient,
    logger,
    publicBaseUrl: runtime.publicOrigin.origin,
  });
}

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
