#!/usr/bin/env node
// No network, no upload, no DB open. Local code+runtime configuration gate only.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export function checkPublisher({ paths, readiness, env }) {
  const components = Object.fromEntries(
    Object.entries(paths).map(([name, path]) => [name, existsSync(path)]),
  );
  const pubEnv = Boolean(
    env.CATALOG_DATABASE_PATH && env.CATALOG_STORAGE_DIR &&
    (env.PUBLISHER_API_SECRET || env.PUBLISHER_API_SECRET_FILE) &&
    (env.CATALOG_SERVER_SECRET || env.CATALOG_SERVER_SECRET_FILE),
  );
  const flags = {
    pilotReady: readiness?.pilotReady === true,
    customerDataAllowed: readiness?.customerDataAllowed === true,
    automaticDeliveryAllowed: readiness?.automaticDeliveryAllowed === true,
  };
  return {
    schema: 'gameplay.evydflow-publisher-doctor.v1',
    source_components_present: components,
    publisher_environment_keys_present: pubEnv,
    readiness_flags: flags,
    ready_to_publish_customer_data:
      Object.values(components).every(Boolean) && pubEnv && Object.values(flags).every(Boolean),
    deployed_vps_verified: false,
    synthetic_session_verified: false,
    external_operations: 0,
    next: !Object.values(components).every(Boolean) ? 'INTEGRATE_OWNER_PRS' :
      !pubEnv ? 'CONFIGURE_PRIVATE_RUNTIME' :
        !Object.values(flags).every(Boolean) ? 'PROVE_SYNTHETIC_SMOKE_AND_RELEASE_GATES' :
          'REQUIRE_PRIVATE_VPS_AND_PUBLIC_GET_PROOF',
  };
}

const paths = {
  private_http: resolve(root, 'apps/catalog-server/src/publication/PublicationService.ts'),
  sqlite: resolve(root, 'apps/catalog-server/src/publication/SessionRepository.ts'),
  physical_blobs: resolve(root, 'apps/catalog-server/src/storage/FileSystemStorageService.ts'),
  publisher_cli: resolve(root, 'tools/deploy/publish-session.mjs'),
  openapi: resolve(root, 'docs/contracts/mvp-photo-publication-v1.openapi.json'),
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let readiness;
  try {
    readiness = JSON.parse(readFileSync(resolve(root, 'deploy/readiness.json'), 'utf8'));
  } catch {
    readiness = {};
  }
  const report = checkPublisher({ paths, readiness, env: process.env });
  process.stdout.write(`${JSON.stringify(report)}\n`);
  // A blocked state is a factual report, not a crashing runtime test.
  process.exitCode = report.ready_to_publish_customer_data ? 0 : 2;
}
