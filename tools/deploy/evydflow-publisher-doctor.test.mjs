import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { checkPublisher } from './evydflow-publisher-doctor.mjs';

test('source is not production readiness and absent env never opens socket', async () => {
  const d = await mkdtemp(join(tmpdir(), 'publisher-gate-'));
  try {
    const f = join(d, 'source.ts');
    await writeFile(f, 'fixture');
    const args = { paths: { publisher: f }, readiness: {
      pilotReady: false, customerDataAllowed: false, automaticDeliveryAllowed: false,
    }, env: {} };
    const p = checkPublisher(args);
    assert.equal(p.source_components_present.publisher, true);
    assert.equal(p.ready_to_publish_customer_data, false);
    assert.equal(p.deployed_vps_verified, false);
    assert.equal(p.external_operations, 0);
    const q = checkPublisher({ ...args, readiness: {
      pilotReady: true, customerDataAllowed: true, automaticDeliveryAllowed: true,
    }, env: {
      CATALOG_DATABASE_PATH: 'db', CATALOG_STORAGE_DIR: 'storage',
      PUBLISHER_API_SECRET_FILE: 'privatefile', CATALOG_SERVER_SECRET_FILE: 'serverfile',
    } });
    assert.equal(q.ready_to_publish_customer_data, true);
    assert.equal(q.deployed_vps_verified, false);
  } finally {
    await rm(d, { force: true, recursive: true });
  }
});
