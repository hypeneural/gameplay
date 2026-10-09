import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PublicationDomainError, SqliteSessionRepository } from './SessionRepository.js';
import type { PublicationManifestV1 } from './publicationManifest.js';
import { applyMigrations, openSqliteDatabase } from './sqliteDatabase.js';

const TEST_SECRET = 'super-secret-key-for-test-publisher-32chars!';
const CRM_ORDER_A = '11111111-1111-4111-8111-111111111111';
const CRM_ORDER_B = '22222222-2222-4222-8222-222222222222';

interface TestManifestResult {
  readonly manifest: PublicationManifestV1;
  readonly rawJson: string;
}

function createManifest(
  sessionId: string,
  requestId: string,
  expectedActiveRevisionId: string | null = null,
  photoId: string = 'photo-01',
  blobPrefix: string = '33333333-3333-4333-8333-33333333333',
): TestManifestResult {
  const manifest: PublicationManifestV1 = {
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

  return { manifest, rawJson: JSON.stringify(manifest) };
}

describe('SessionRepository with SQLite, CAS and A1/A2/B isolation', () => {
  it('resolves or creates a session idempotently and derives public token', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const session1 = await repo.resolveOrCreateSession(CRM_ORDER_A);
    expect(session1.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(session1.activeRevisionId).toBeNull();
    expect(session1.status).toBe('ACTIVE');
    expect(session1.publicToken).toBeDefined();

    // Replay returns identical session
    const session2 = await repo.resolveOrCreateSession(CRM_ORDER_A);
    expect(session2.sessionId).toBe(session1.sessionId);
    expect(session2.publicToken).toBe(session1.publicToken);

    // Order B creates distinct isolated session
    const sessionB = await repo.resolveOrCreateSession(CRM_ORDER_B);
    expect(sessionB.sessionId).not.toBe(session1.sessionId);
    expect(sessionB.publicToken).not.toBe(session1.publicToken);

    db.close();
  });

  it('stages a revision, checks idempotency replay, and rejects conflicting replay', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const sessionA = await repo.resolveOrCreateSession(CRM_ORDER_A);
    const requestId = '44444444-4444-4444-8444-444444444444';
    const { manifest, rawJson } = createManifest(sessionA.sessionId, requestId, null);

    const staged = await repo.beginPublication(manifest, rawJson);
    expect(staged.state).toBe('STAGED');
    expect(staged.expectedBlobs).toBe(3);
    expect(staged.readyBlobs).toBe(0);
    expect(staged.pendingBlobIds).toHaveLength(3);

    // Replay with identical payload returns the same revision
    const replay = await repo.beginPublication(manifest, rawJson);
    expect(replay.revisionId).toBe(staged.revisionId);

    // Replay with different manifest content throws IDEMPOTENCY_CONFLICT
    const conflictingManifest: PublicationManifestV1 = {
      ...manifest,
      recipeKey: 'recipe-different',
    };
    const conflictingJson = JSON.stringify(conflictingManifest);
    await expect(repo.beginPublication(conflictingManifest, conflictingJson)).rejects.toThrowError(
      PublicationDomainError,
    );

    db.close();
  });

  it('records verified blobs idempotently and rejects attribute mismatch', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const sessionA = await repo.resolveOrCreateSession(CRM_ORDER_A);
    const { manifest, rawJson } = createManifest(
      sessionA.sessionId,
      '55555555-5555-4555-8555-555555555555',
      null,
    );
    const staged = await repo.beginPublication(manifest, rawJson);

    const firstPhoto = manifest.photos[0]!;
    const thumb = firstPhoto.variants.thumb;
    const recorded = await repo.recordVerifiedBlob(staged.revisionId, thumb.blobId, {
      sha256: thumb.sha256,
      byteLength: thumb.byteLength,
      width: thumb.width,
      height: thumb.height,
    });
    expect(recorded.state).toBe('READY');

    // Duplicate call is idempotent
    const duplicate = await repo.recordVerifiedBlob(staged.revisionId, thumb.blobId, {
      sha256: thumb.sha256,
      byteLength: thumb.byteLength,
      width: thumb.width,
      height: thumb.height,
    });
    expect(duplicate.state).toBe('READY');

    // Mismatched hash rejected with INVALID_MEDIA
    await expect(
      repo.recordVerifiedBlob(staged.revisionId, firstPhoto.variants.card.blobId, {
        sha256: '0000000000000000000000000000000000000000000000000000000000000000',
        byteLength: 120000,
        width: 800,
        height: 600,
      }),
    ).rejects.toThrowError(PublicationDomainError);

    db.close();
  });

  it('fails activation if blobs are incomplete, and succeeds with CAS when all are ready', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const sessionA = await repo.resolveOrCreateSession(CRM_ORDER_A);
    const { manifest, rawJson } = createManifest(
      sessionA.sessionId,
      '66666666-6666-4666-8666-666666666666',
      null,
    );
    const staged = await repo.beginPublication(manifest, rawJson);

    // Only 2 of 3 blobs verified
    const firstPhoto = manifest.photos[0]!;
    const p = firstPhoto.variants;
    await repo.recordVerifiedBlob(staged.revisionId, p.thumb.blobId, p.thumb);
    await repo.recordVerifiedBlob(staged.revisionId, p.card.blobId, p.card);

    // Activation fails with UPLOAD_INCOMPLETE
    await expect(repo.activatePublication(staged.revisionId, null)).rejects.toThrowError(
      PublicationDomainError,
    );

    // Verify third blob
    await repo.recordVerifiedBlob(staged.revisionId, p.game.blobId, p.game);

    // Activation succeeds
    const receipt = await repo.activatePublication(staged.revisionId, null);
    expect(receipt.state).toBe('ACTIVE');
    expect(receipt.photoCount).toBe(1);
    expect(receipt.accessUrl).toContain('/s/');

    // Check active session data
    const active = await repo.getActiveSession(sessionA.publicToken!);
    expect(active).not.toBeNull();
    expect(active!.photos).toHaveLength(1);
    expect(active!.photos[0]!.id).toBe('photo-01');

    db.close();
  });

  it('manages A1 -> A2 lifecycle: zero-downtime staging, CAS activation, and stale CAS rejection', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const sessionA = await repo.resolveOrCreateSession(CRM_ORDER_A);

    // 1. Publish A1
    const revA1 = createManifest(
      sessionA.sessionId,
      '77777777-7777-4777-8777-777777777771',
      null,
      'photo-A1',
      '33333333-3333-4333-8333-33333333333',
    );
    const stagedA1 = await repo.beginPublication(revA1.manifest, revA1.rawJson);
    const photoA1 = revA1.manifest.photos[0]!;
    for (const variant of Object.values(photoA1.variants)) {
      await repo.recordVerifiedBlob(stagedA1.revisionId, variant.blobId, variant);
    }
    await repo.activatePublication(stagedA1.revisionId, null);

    // A1 is active
    const active1 = await repo.getActiveSession(sessionA.publicToken!);
    expect(active1!.photos[0]!.id).toBe('photo-A1');

    // 2. Stage A2 with expectedActiveRevisionId = stagedA1.revisionId
    const revA2 = createManifest(
      sessionA.sessionId,
      '77777777-7777-4777-8777-777777777772',
      stagedA1.revisionId,
      'photo-A2',
      '88888888-8888-4888-8888-88888888888',
    );
    const stagedA2 = await repo.beginPublication(revA2.manifest, revA2.rawJson);

    // While A2 is staged, A1 is still active
    const activeWhileStaged = await repo.getActiveSession(sessionA.publicToken!);
    expect(activeWhileStaged!.photos[0]!.id).toBe('photo-A1');

    const photoA2 = revA2.manifest.photos[0]!;
    for (const variant of Object.values(photoA2.variants)) {
      await repo.recordVerifiedBlob(stagedA2.revisionId, variant.blobId, variant);
    }

    // Stale CAS attempt (passing null instead of stagedA1.revisionId) fails
    await expect(repo.activatePublication(stagedA2.revisionId, null)).rejects.toThrowError(
      PublicationDomainError,
    );

    // Correct CAS activation succeeds
    const receiptA2 = await repo.activatePublication(stagedA2.revisionId, stagedA1.revisionId);
    expect(receiptA2.state).toBe('ACTIVE');

    // Now A2 is active!
    const active2 = await repo.getActiveSession(sessionA.publicToken!);
    expect(active2!.photos[0]!.id).toBe('photo-A2');

    db.close();
  });

  it('guarantees complete isolation between session A and session B', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const sessionA = await repo.resolveOrCreateSession(CRM_ORDER_A);
    const sessionB = await repo.resolveOrCreateSession(CRM_ORDER_B);

    // Publish A
    const revA = createManifest(
      sessionA.sessionId,
      '99999999-9999-4999-8999-999999999991',
      null,
      'photo-A',
      '33333333-3333-4333-8333-33333333333',
    );
    const stagedA = await repo.beginPublication(revA.manifest, revA.rawJson);
    const photoA = revA.manifest.photos[0]!;
    for (const v of Object.values(photoA.variants)) {
      await repo.recordVerifiedBlob(stagedA.revisionId, v.blobId, v);
    }
    await repo.activatePublication(stagedA.revisionId, null);

    // Publish B
    const revB = createManifest(
      sessionB.sessionId,
      '99999999-9999-4999-8999-999999999992',
      null,
      'photo-B',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee',
    );
    const stagedB = await repo.beginPublication(revB.manifest, revB.rawJson);
    const photoB = revB.manifest.photos[0]!;
    for (const v of Object.values(photoB.variants)) {
      await repo.recordVerifiedBlob(stagedB.revisionId, v.blobId, v);
    }
    await repo.activatePublication(stagedB.revisionId, null);

    // Active session for A only has A's photos
    const dataA = await repo.getActiveSession(sessionA.publicToken!);
    expect(dataA!.photos[0]!.id).toBe('photo-A');

    // Active session for B only has B's photos
    const dataB = await repo.getActiveSession(sessionB.publicToken!);
    expect(dataB!.photos[0]!.id).toBe('photo-B');

    // Cross-session: B's token cannot resolve A's data
    expect(dataA!.publicToken).not.toBe(dataB!.publicToken);

    db.close();
  });

  it('preserves database integrity and active revision across process restart', async () => {
    const testDbPath = join(tmpdir(), `test-photo-sessions-${Date.now()}.db`);

    try {
      // First connection: create session and publish
      const db1 = openSqliteDatabase(testDbPath);
      applyMigrations(db1);
      const repo1 = new SqliteSessionRepository({ db: db1, serverSecret: TEST_SECRET });

      const session = await repo1.resolveOrCreateSession(CRM_ORDER_A);
      const rev = createManifest(
        session.sessionId,
        'ffffffff-ffff-4fff-8fff-ffffffffffff',
        null,
        'persisted-photo',
        '77777777-7777-4777-8777-77777777777',
      );
      const staged = await repo1.beginPublication(rev.manifest, rev.rawJson);
      const photo = rev.manifest.photos[0]!;
      for (const v of Object.values(photo.variants)) {
        await repo1.recordVerifiedBlob(staged.revisionId, v.blobId, v);
      }
      await repo1.activatePublication(staged.revisionId, null);

      // Verify active before restart
      const beforeClose = await repo1.getActiveSession(session.publicToken!);
      expect(beforeClose!.photos[0]!.id).toBe('persisted-photo');

      // Close database (simulating process restart)
      db1.close();

      // Second connection: open same file
      const db2 = openSqliteDatabase(testDbPath);
      applyMigrations(db2);
      const repo2 = new SqliteSessionRepository({ db: db2, serverSecret: TEST_SECRET });

      // Foreign key check returns no violations
      const fkCheck = db2.prepare('PRAGMA foreign_key_check;').all();
      expect(fkCheck).toEqual([]);

      // Verify active revision restored seamlessly
      const afterRestart = await repo2.getActiveSession(session.publicToken!);
      expect(afterRestart).not.toBeNull();
      expect(afterRestart!.photos[0]!.id).toBe('persisted-photo');

      db2.close();
    } finally {
      try {
        rmSync(testDbPath, { force: true });
        rmSync(`${testDbPath}-wal`, { force: true });
        rmSync(`${testDbPath}-shm`, { force: true });
      } catch {
        // ignore cleanup error
      }
    }
  });

  it('revokes a session, immediately invalidating public token access', async () => {
    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);
    const repo = new SqliteSessionRepository({ db, serverSecret: TEST_SECRET });

    const session = await repo.resolveOrCreateSession(CRM_ORDER_A);
    const rev = createManifest(
      session.sessionId,
      '12121212-1212-4212-8212-121212121212',
      null,
      'revokable-photo',
      '66666666-6666-4666-8666-66666666666',
    );
    const staged = await repo.beginPublication(rev.manifest, rev.rawJson);
    const photo = rev.manifest.photos[0]!;
    for (const v of Object.values(photo.variants)) {
      await repo.recordVerifiedBlob(staged.revisionId, v.blobId, v);
    }
    await repo.activatePublication(staged.revisionId, null);

    // Active before revocation
    const active = await repo.getActiveSession(session.publicToken!);
    expect(active).not.toBeNull();

    // Revoke
    await repo.revokeSession(session.sessionId);

    // Invalidation is immediate (fail closed)
    const afterRevocation = await repo.getActiveSession(session.publicToken!);
    expect(afterRevocation).toBeNull();

    // Resolving session again reports status REVOKED
    const resolved = await repo.resolveOrCreateSession(CRM_ORDER_A);
    expect(resolved.status).toBe('REVOKED');
    expect(resolved.publicToken).toBeUndefined();

    db.close();
  });
});
