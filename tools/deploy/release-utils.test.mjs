import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertNoForbiddenReleaseFiles,
  assertReleaseAllowed,
  inventoryReleaseFiles,
} from './release-utils.mjs';

const stagingReadiness = {
  schemaVersion: 1,
  currentStage: 'vps-staging-demo',
  allowedReleaseStages: ['staging-demo'],
  pilotReady: false,
  customerDataAllowed: false,
  blockersBeforePilot: ['real session authority'],
};

describe('release safety policy', () => {
  it('allows only the explicitly declared staging stage', () => {
    expect(() => assertReleaseAllowed(stagingReadiness, 'staging-demo')).not.toThrow();
    expect(() => assertReleaseAllowed(stagingReadiness, 'pilot')).toThrow(/blocked/);
  });

  it('rejects a staging policy that accidentally allows customer data', () => {
    expect(() =>
      assertReleaseAllowed({ ...stagingReadiness, customerDataAllowed: true }, 'staging-demo'),
    ).toThrow(/customer data/);
  });

  it('rejects release files that can contain private/runtime state', () => {
    expect(() =>
      assertNoForbiddenReleaseFiles([
        { path: 'server/app.js', bytes: 10, sha256: 'x' },
        { path: 'private/session.sqlite', bytes: 20, sha256: 'y' },
      ]),
    ).toThrow(/session\.sqlite/);
  });

  it('creates a deterministic path, byte and SHA-256 inventory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-release-'));
    try {
      await writeFile(join(root, 'a.txt'), 'abc', 'utf8');
      const files = await inventoryReleaseFiles(root);
      expect(files).toEqual([
        {
          path: 'a.txt',
          bytes: 3,
          sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
