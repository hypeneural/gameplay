import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PublicationDomainError,
  SqliteSessionRepository,
  type VerifiedBlobConfirmation,
} from './SessionRepository.js';
import {
  canonicalizePublicationManifest,
  type PublicationManifestV1,
} from './publicationManifest.js';
import { applyMigrations, openSqliteDatabase } from './sqliteDatabase.js';
import { assertValidServerSecret } from './tokenSecurity.js';

const TEST_SECRET = 'hardening-test-secret-min-32chars-ok!!';
const ORDER_UUID_1 = '11111111-1111-4111-8111-111111111111';
const ORDER_UUID_2 = '22222222-2222-4222-8222-222222222222';

function makeTestManifest(
  sessionId: string,
  requestId: string,
  expectedActiveRevisionId: string | null = null,
  photoId: string = 'photo-01',
  blobPrefix: string = '33333333-3333-4333-8333-33333333333',
): PublicationManifestV1 {
  return {
    schemaVersion: 1,
    requestId,
    sessionId,
    expectedActiveRevisionId,
    recipeKey: 'recipe-1-webp82-srgb-inside',
    photos: [
      {
        photoId,
        contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sortIndex: 0,
        width: 1600,
        height: 1200,
        variants: {
          thumb: {
            blobId: `${blobPrefix}1`,
            sha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            byteLength: 45000,
            width: 480,
            height: 360,
          },
          card: {
            blobId: `${blobPrefix}2`,
            sha256: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
            byteLength: 120000,
            width: 800,
            height: 600,
          },
          game: {
            blobId: `${blobPrefix}3`,
            sha256: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
            byteLength: 350000,
            width: 1600,
            height: 1200,
          },
        },
      },
    ],
  };
}

function makeBlobConfirmation(
  revisionId: string,
  variant: { blobId: string; sha256: string; byteLength: number; width: number; height: number },
  override?: Partial<VerifiedBlobConfirmation>,
): VerifiedBlobConfirmation {
  return {
    revisionId,
    blobId: variant.blobId,
    sha256: variant.sha256,
    byteLength: variant.byteLength,
    width: variant.width,
    height: variant.height,
    storageConfirmed: true,
    ...override,
  };
}

async function stageAndVerifyBlobs(repo: SqliteSessionRepository, manifest: PublicationManifestV1) {
  const staged = await repo.beginPublication(manifest);
  for (const photo of manifest.photos) {
    for (const variant of Object.values(photo.variants)) {
      await repo.recordVerifiedBlob(makeBlobConfirmation(staged.revisionId, variant));
    }
  }
  return staged;
}

describe('Forensic regression suite: Hardening Corte 1 & Preparation Corte 2', () => {
  it('canonicalizes_semantically_identical_manifest', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const session = await repo.resolveOrCreateSession(ORDER_UUID_1);
    const m1 = makeTestManifest(session.sessionId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null);

    // Reordered manifest: different key order in JS objects
    const m2: PublicationManifestV1 = {
      photos: [
        {
          variants: {
            game: { ...m1.photos[0]!.variants.game },
            card: { ...m1.photos[0]!.variants.card },
            thumb: { ...m1.photos[0]!.variants.thumb },
          },
          height: 1200,
          width: 1600,
          sortIndex: 0,
          contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          photoId: 'photo-01',
        },
      ],
      recipeKey: 'recipe-1-webp82-srgb-inside',
      expectedActiveRevisionId: null,
      sessionId: session.sessionId,
      requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      schemaVersion: 1,
    };

    const c1 = canonicalizePublicationManifest(m1);
    const c2 = canonicalizePublicationManifest(m2);

    expect(c1).toBe(c2);
    expect(createHash('sha256').update(c1).digest('hex')).toBe(
      createHash('sha256').update(c2).digest('hex'),
    );

    const staged1 = await repo.beginPublication(m1);
    const replay2 = await repo.beginPublication(m2);
    expect(replay2.revisionId).toBe(staged1.revisionId);

    db.close();
  });

  it('rejects_manifest_raw_json_mismatch', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    // Invalid schema structure missing required properties
    const invalidManifest = {
      schemaVersion: 1,
      photos: [],
    };

    await expect(repo.beginPublication(invalidManifest)).rejects.toThrowError(
      PublicationDomainError,
    );

    // Corrupted dimensions / variants
    const corruptVariantManifest = {
      schemaVersion: 1,
      requestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      sessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      recipeKey: 'recipe-1-webp82-srgb-inside',
      photos: [
        {
          photoId: 'p1',
          contentHash: 'a'.repeat(64),
          sortIndex: 0,
          width: -50,
          height: 1200,
          variants: {},
        },
      ],
    };

    await expect(repo.beginPublication(corruptVariantManifest)).rejects.toThrowError(
      PublicationDomainError,
    );

    db.close();
  });

  it('rejects_activation_with_altered_expected_revision', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const session = await repo.resolveOrCreateSession(ORDER_UUID_1);
    const m1 = makeTestManifest(session.sessionId, '11111111-1111-4111-8111-111111111111', null);
    const stagedA1 = await stageAndVerifyBlobs(repo, m1);
    await repo.activatePublication(stagedA1.revisionId, null);

    // Stage A2 expecting A1
    const m2 = makeTestManifest(
      session.sessionId,
      '22222222-2222-4222-8222-222222222222',
      stagedA1.revisionId,
      'photo-02',
      '44444444-4444-4444-8444-44444444444',
    );
    const stagedA2 = await stageAndVerifyBlobs(repo, m2);

    // Altered expected_active_revision_id at activation time
    const alteredRevision = '00000000-0000-4000-8000-000000000000';
    await expect(
      repo.activatePublication(stagedA2.revisionId, alteredRevision),
    ).rejects.toThrowError(PublicationDomainError);

    // Stale activation attempt passing null when A1 is active
    await expect(repo.activatePublication(stagedA2.revisionId, null)).rejects.toThrowError(
      PublicationDomainError,
    );

    db.close();
  });

  it('rejects_reactivation_of_superseded_revision', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const session = await repo.resolveOrCreateSession(ORDER_UUID_1);
    const m1 = makeTestManifest(session.sessionId, '11111111-1111-4111-8111-111111111111', null);
    const stagedA1 = await stageAndVerifyBlobs(repo, m1);
    await repo.activatePublication(stagedA1.revisionId, null);

    const m2 = makeTestManifest(
      session.sessionId,
      '22222222-2222-4222-8222-222222222222',
      stagedA1.revisionId,
      'photo-02',
      '44444444-4444-4444-8444-44444444444',
    );
    const stagedA2 = await stageAndVerifyBlobs(repo, m2);
    await repo.activatePublication(stagedA2.revisionId, stagedA1.revisionId);

    // A1 is now SUPERSEDED
    const a1Row = db
      .prepare('SELECT state FROM photo_revisions WHERE id = ?')
      .get(stagedA1.revisionId) as { state: string };
    expect(a1Row.state).toBe('SUPERSEDED');

    // Attempting to reactivate A1 fails
    await expect(
      repo.activatePublication(stagedA1.revisionId, stagedA2.revisionId),
    ).rejects.toThrowError(PublicationDomainError);

    db.close();
  });

  it('rejects_activation_of_failed_revision', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const session = await repo.resolveOrCreateSession(ORDER_UUID_1);
    const m = makeTestManifest(session.sessionId, '33333333-3333-4333-8333-333333333333', null);
    const staged = await stageAndVerifyBlobs(repo, m);

    // Simulate revision transition to FAILED
    db.prepare("UPDATE photo_revisions SET state = 'FAILED' WHERE id = ?").run(staged.revisionId);

    await expect(repo.activatePublication(staged.revisionId, null)).rejects.toThrowError(
      PublicationDomainError,
    );

    db.close();
  });

  it('rejects_blob_update_after_activation', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const session = await repo.resolveOrCreateSession(ORDER_UUID_1);
    const m = makeTestManifest(session.sessionId, '44444444-4444-4444-8444-444444444444', null);
    const staged = await stageAndVerifyBlobs(repo, m);
    await repo.activatePublication(staged.revisionId, null);

    // Revision is now ACTIVE; attempting to record a blob must fail
    const blob = m.photos[0]!.variants.thumb;
    await expect(
      repo.recordVerifiedBlob(makeBlobConfirmation(staged.revisionId, blob)),
    ).rejects.toThrowError(PublicationDomainError);

    db.close();
  });

  it('rolls_back_incomplete_migration', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'migration-rollback-'));
    try {
      writeFileSync(
        join(tempDir, '001_initial.sql'),
        'CREATE TABLE test_table_1 (id TEXT PRIMARY KEY);',
      );
      writeFileSync(
        join(tempDir, '002_broken.sql'),
        'CREATE TABLE test_table_2 (id TEXT PRIMARY KEY); THIS_IS_INVALID_SQL_HERE;',
      );

      const db = openSqliteDatabase(':memory:');
      expect(() => applyMigrations(db, tempDir)).toThrow();

      // test_table_1 was applied and committed in migration 001
      const table1 = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='test_table_1'")
        .get();
      expect(table1).toBeDefined();

      // test_table_2 in migration 002 was rolled back atomically
      const table2 = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='test_table_2'")
        .get();
      expect(table2).toBeUndefined();

      db.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects_missing_migration_in_release', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'migration-tamper-'));
    try {
      writeFileSync(
        join(tempDir, '001_initial.sql'),
        'CREATE TABLE test_table (id TEXT PRIMARY KEY);',
      );

      const db = openSqliteDatabase(':memory:');
      applyMigrations(db, tempDir);

      // Tamper with the migration file content
      writeFileSync(
        join(tempDir, '001_initial.sql'),
        'CREATE TABLE test_table (id TEXT PRIMARY KEY, extra TEXT);',
      );

      expect(() => applyMigrations(db, tempDir)).toThrow(/migration_checksum_mismatch/);

      db.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('handles_concurrent_session_creation', async () => {
    const testDbPath = join(tmpdir(), `concurrent-session-${Date.now()}.db`);
    try {
      const db1 = openSqliteDatabase(testDbPath);
      applyMigrations(db1);
      const db2 = openSqliteDatabase(testDbPath);

      const repo1 = new SqliteSessionRepository({ db: db1, serverSecret: TEST_SECRET });
      const repo2 = new SqliteSessionRepository({ db: db2, serverSecret: TEST_SECRET });

      // Concurrent invocation for the same order UUID
      const [res1, res2] = await Promise.all([
        repo1.resolveOrCreateSession(ORDER_UUID_1),
        repo2.resolveOrCreateSession(ORDER_UUID_1),
      ]);

      expect(res1.sessionId).toBe(res2.sessionId);
      expect(res1.publicToken).toBe(res2.publicToken);
      expect(res1.status).toBe('ACTIVE');

      db1.close();
      db2.close();
    } finally {
      rmSync(testDbPath, { force: true });
      rmSync(`${testDbPath}-wal`, { force: true });
      rmSync(`${testDbPath}-shm`, { force: true });
    }
  });

  it('handles_concurrent_revision_activation', async () => {
    const testDbPath = join(tmpdir(), `concurrent-activation-${Date.now()}.db`);
    try {
      const db1 = openSqliteDatabase(testDbPath);
      applyMigrations(db1);
      const db2 = openSqliteDatabase(testDbPath);

      const repo1 = new SqliteSessionRepository({ db: db1, serverSecret: TEST_SECRET });
      const repo2 = new SqliteSessionRepository({ db: db2, serverSecret: TEST_SECRET });

      const session = await repo1.resolveOrCreateSession(ORDER_UUID_1);

      // Publish A1
      const mA1 = makeTestManifest(session.sessionId, '11111111-1111-4111-8111-111111111111', null);
      const stagedA1 = await stageAndVerifyBlobs(repo1, mA1);
      await repo1.activatePublication(stagedA1.revisionId, null);

      // Stage A2 expecting A1
      const mA2 = makeTestManifest(
        session.sessionId,
        '22222222-2222-4222-8222-222222222222',
        stagedA1.revisionId,
        'photo-A2',
        '55555555-5555-4555-8555-55555555555',
      );
      const stagedA2 = await stageAndVerifyBlobs(repo1, mA2);

      // Stage A3 also expecting A1
      const mA3 = makeTestManifest(
        session.sessionId,
        '33333333-3333-4333-8333-333333333333',
        stagedA1.revisionId,
        'photo-A3',
        '66666666-6666-4666-8666-66666666666',
      );
      const stagedA3 = await stageAndVerifyBlobs(repo2, mA3);

      // Both attempt to activate concurrently with CAS expecting A1
      const results = await Promise.allSettled([
        repo1.activatePublication(stagedA2.revisionId, stagedA1.revisionId),
        repo2.activatePublication(stagedA3.revisionId, stagedA1.revisionId),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // Foreign keys remain 100% valid
      expect(db1.prepare('PRAGMA foreign_key_check;').all()).toEqual([]);

      db1.close();
      db2.close();
    } finally {
      rmSync(testDbPath, { force: true });
      rmSync(`${testDbPath}-wal`, { force: true });
      rmSync(`${testDbPath}-shm`, { force: true });
    }
  });

  it('never_returns_public_token_for_revoked_session', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const session = await repo.resolveOrCreateSession(ORDER_UUID_1);
    expect(session.publicToken).toBeDefined();

    await repo.revokeSession(session.sessionId);

    // Resolving again returns status REVOKED and no token
    const revokedSession = await repo.resolveOrCreateSession(ORDER_UUID_1);
    expect(revokedSession.status).toBe('REVOKED');
    expect(revokedSession.publicToken).toBeUndefined();

    // Validating token fails closed
    const active = await repo.getActiveSession(session.publicToken!);
    expect(active).toBeNull();

    // Secret validation assertion
    expect(() => assertValidServerSecret('short-secret')).toThrow(
      /server_secret_must_be_at_least_32_characters/,
    );
    expect(() => assertValidServerSecret(TEST_SECRET)).not.toThrow();

    db.close();
  });

  it('fails_closed_on_corrupt_persisted_manifest', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const session = await repo.resolveOrCreateSession(ORDER_UUID_1);
    const m = makeTestManifest(session.sessionId, '55555555-5555-4555-8555-555555555555', null);
    const staged = await stageAndVerifyBlobs(repo, m);
    await repo.activatePublication(staged.revisionId, null);

    // Corrupt manifest JSON in database
    db.prepare('UPDATE photo_revisions SET manifest_json = \'{"invalid": true}\' WHERE id = ?').run(
      staged.revisionId,
    );

    // Access fails closed throwing MANIFEST_CORRUPTED instead of serving corrupt data
    await expect(repo.getActiveSession(session.publicToken!)).rejects.toThrowError(
      PublicationDomainError,
    );

    db.close();
  });

  it('handles_concurrent_begin_publication_without_sequence_collision', async () => {
    const testDbPath = join(tmpdir(), `concurrent-begin-${Date.now()}.db`);
    try {
      const db1 = openSqliteDatabase(testDbPath);
      applyMigrations(db1);
      const db2 = openSqliteDatabase(testDbPath);

      const repo1 = new SqliteSessionRepository({ db: db1, serverSecret: TEST_SECRET });
      const repo2 = new SqliteSessionRepository({ db: db2, serverSecret: TEST_SECRET });

      const session = await repo1.resolveOrCreateSession(ORDER_UUID_2);

      const m1 = makeTestManifest(session.sessionId, '77777777-7777-4777-8777-777777777771', null);
      const m2 = makeTestManifest(
        session.sessionId,
        '77777777-7777-4777-8777-777777777772',
        null,
        'photo-02',
        '88888888-8888-4888-8888-88888888888',
      );

      const [res1, res2] = await Promise.all([
        repo1.beginPublication(m1),
        repo2.beginPublication(m2),
      ]);

      expect(res1.state).toBe('STAGED');
      expect(res2.state).toBe('STAGED');
      expect(res1.revisionId).not.toBe(res2.revisionId);

      const rows = db1
        .prepare('SELECT id, sequence FROM photo_revisions WHERE session_id = ? ORDER BY sequence')
        .all(session.sessionId) as Array<{ id: string; sequence: number }>;

      expect(rows).toHaveLength(2);
      expect(rows[0]!.sequence).toBe(1);
      expect(rows[1]!.sequence).toBe(2);

      db1.close();
      db2.close();
    } finally {
      rmSync(testDbPath, { force: true });
      rmSync(`${testDbPath}-wal`, { force: true });
      rmSync(`${testDbPath}-shm`, { force: true });
    }
  });
});
