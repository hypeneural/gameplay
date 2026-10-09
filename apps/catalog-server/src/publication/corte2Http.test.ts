import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCatalogServer } from '../CatalogServer.js';
import {
  FileSystemStorageService,
  MAX_BLOB_BYTE_LENGTH,
} from '../storage/FileSystemStorageService.js';
import { PublicationService } from './PublicationService.js';
import { SqliteSessionRepository } from './SessionRepository.js';
import { applyMigrations, openSqliteDatabase } from './sqliteDatabase.js';
import { StructuredPublicationLogger } from './publicationLogger.js';
import type { PublicationLogEntry } from './publicationLogger.js';

function createSyntheticVp8Webp(width: number, height: number): Buffer {
  const vp8Payload = Buffer.alloc(10);
  vp8Payload[0] = 0x00;
  vp8Payload[1] = 0x00;
  vp8Payload[2] = 0x00;
  vp8Payload[3] = 0x9d;
  vp8Payload[4] = 0x01;
  vp8Payload[5] = 0x2a;
  vp8Payload.writeUInt16LE(width & 0x3fff, 6);
  vp8Payload.writeUInt16LE(height & 0x3fff, 8);

  const vp8ChunkSize = vp8Payload.length;
  const riffSize = 4 + 8 + vp8ChunkSize;

  const buffer = Buffer.alloc(8 + riffSize);
  buffer.write('RIFF', 0, 4, 'ascii');
  buffer.writeUInt32LE(riffSize, 4);
  buffer.write('WEBP', 8, 4, 'ascii');
  buffer.write('VP8 ', 12, 4, 'ascii');
  buffer.writeUInt32LE(vp8ChunkSize, 16);
  vp8Payload.copy(buffer, 20);

  return buffer;
}

const PUBLISHER_SECRET = 'super-secret-publisher-token-test-12345';
const SERVER_SECRET = 'server-secret-for-tokens-12345678901234567890';

describe('Corte 2 HTTP Endpoints & Storage Flow', () => {
  let tempStorageDir: string;
  let server: Server;
  let baseUrl: string;
  let logs: PublicationLogEntry[];

  beforeEach(async () => {
    logs = [];
    tempStorageDir = await mkdtemp(join(tmpdir(), 'corte2-test-'));

    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);

    const sessionRepository = new SqliteSessionRepository({
      db,
      serverSecret: SERVER_SECRET,
      publicBaseUrl: 'http://127.0.0.1',
    });

    const storageService = new FileSystemStorageService({
      storageDir: tempStorageDir,
    });

    const logger = new StructuredPublicationLogger({
      sink: (line) => logs.push(JSON.parse(line) as PublicationLogEntry),
    });

    const publicationService = new PublicationService({
      sessionRepository,
      storageService,
      publisherSecret: PUBLISHER_SECRET,
      logger,
      publicBaseUrl: 'http://127.0.0.1',
    });

    server = createCatalogServer({
      publicOrigin: new URL('http://127.0.0.1'),
      loadApplicationShell: async () => '<html></html>',
      previews: {
        async getByPublicToken() {
          return undefined;
        },
      },
      audit: { async record() {} },
      clock: { now: () => new Date() },
      runtime: { releaseStage: 'development' },
      publicationService,
    });

    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    server.close();
    await once(server, 'close');
    await rm(tempStorageDir, { recursive: true, force: true });
  });

  it('rejects publisher endpoints with 401 when Authorization header is missing or invalid', async () => {
    const resNoAuth = await fetch(`${baseUrl}/internal/v1/sessions/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crmOrderUuid: randomUUID() }),
    });
    expect(resNoAuth.status).toBe(401);
    const bodyNoAuth = (await resNoAuth.json()) as { code: string };
    expect(bodyNoAuth.code).toBe('PUBLISHER_UNAUTHORIZED');

    const resBadAuth = await fetch(`${baseUrl}/internal/v1/sessions/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wrong-secret',
      },
      body: JSON.stringify({ crmOrderUuid: randomUUID() }),
    });
    expect(resBadAuth.status).toBe(401);
  });

  it('executes full end-to-end publication flow with synthetic images and verified storage', async () => {
    const crmOrderUuid = randomUUID();

    // 1. Resolve Session
    const resolveRes = await fetch(`${baseUrl}/internal/v1/sessions/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify({ crmOrderUuid }),
    });
    expect(resolveRes.status).toBe(201);
    const resolvedSession = (await resolveRes.json()) as {
      sessionId: string;
      activeRevisionId: string | null;
      status: string;
    };
    expect(resolvedSession.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolvedSession.activeRevisionId).toBeNull();
    expect(resolvedSession.status).toBe('ACTIVE');

    // Idempotent resolve returns 200
    const resolveAgain = await fetch(`${baseUrl}/internal/v1/sessions/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify({ crmOrderUuid }),
    });
    expect(resolveAgain.status).toBe(200);
    expect(((await resolveAgain.json()) as typeof resolvedSession).sessionId).toBe(
      resolvedSession.sessionId,
    );

    // 2. Prepare synthetic WebP variants for 1 photo
    const thumbBuf = createSyntheticVp8Webp(480, 360);
    const cardBuf = createSyntheticVp8Webp(800, 600);
    const gameBuf = createSyntheticVp8Webp(1600, 1200);

    const thumbSha256 = createHash('sha256').update(thumbBuf).digest('hex');
    const cardSha256 = createHash('sha256').update(cardBuf).digest('hex');
    const gameSha256 = createHash('sha256').update(gameBuf).digest('hex');

    const thumbBlobId = randomUUID();
    const cardBlobId = randomUUID();
    const gameBlobId = randomUUID();
    const requestId = randomUUID();

    const manifest = {
      schemaVersion: 1,
      requestId,
      sessionId: resolvedSession.sessionId,
      expectedActiveRevisionId: null,
      recipeKey: 'recipe-1-webp82-srgb-inside',
      photos: [
        {
          photoId: 'photo-test-01',
          contentHash: 'a'.repeat(64),
          sortIndex: 0,
          width: 1600,
          height: 1200,
          variants: {
            thumb: {
              blobId: thumbBlobId,
              sha256: thumbSha256,
              byteLength: thumbBuf.length,
              width: 480,
              height: 360,
            },
            card: {
              blobId: cardBlobId,
              sha256: cardSha256,
              byteLength: cardBuf.length,
              width: 800,
              height: 600,
            },
            game: {
              blobId: gameBlobId,
              sha256: gameSha256,
              byteLength: gameBuf.length,
              width: 1600,
              height: 1200,
            },
          },
        },
      ],
    };

    // 3. Begin Publication (POST /internal/v1/publications)
    const beginRes = await fetch(`${baseUrl}/internal/v1/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify(manifest),
    });
    expect(beginRes.status).toBe(201);
    const stagedPub = (await beginRes.json()) as {
      revisionId: string;
      sessionId: string;
      state: string;
      expectedBlobs: number;
      readyBlobs: number;
      pendingBlobIds: string[];
    };
    expect(stagedPub.state).toBe('STAGED');
    expect(stagedPub.expectedBlobs).toBe(3);
    expect(stagedPub.readyBlobs).toBe(0);
    expect(stagedPub.pendingBlobIds).toHaveLength(3);

    const revisionId = stagedPub.revisionId;

    // Idempotent begin replay returns 200
    const beginReplay = await fetch(`${baseUrl}/internal/v1/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify(manifest),
    });
    expect(beginReplay.status).toBe(200);

    // 4. GET Publication Status
    const statusRes = await fetch(`${baseUrl}/internal/v1/publications/${revisionId}`, {
      headers: { Authorization: `Bearer ${PUBLISHER_SECRET}` },
    });
    expect(statusRes.status).toBe(200);
    const currentStatus = (await statusRes.json()) as typeof stagedPub;
    expect(currentStatus.pendingBlobIds).toContain(thumbBlobId);

    // 5. Attempt activate before blobs are uploaded -> 422 UPLOAD_INCOMPLETE
    const prematureActivate = await fetch(
      `${baseUrl}/internal/v1/publications/${revisionId}/activate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PUBLISHER_SECRET}`,
        },
        body: JSON.stringify({ expectedActiveRevisionId: null }),
      },
    );
    expect(prematureActivate.status).toBe(422);
    expect(((await prematureActivate.json()) as { code: string }).code).toBe('UPLOAD_INCOMPLETE');

    // 6. Upload Blobs
    // 6a. Upload thumb blob
    const thumbUpload = await fetch(
      `${baseUrl}/internal/v1/publications/${revisionId}/blobs/${thumbBlobId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/webp',
          'X-Content-SHA256': thumbSha256,
          Authorization: `Bearer ${PUBLISHER_SECRET}`,
        },
        body: new Uint8Array(thumbBuf),
      },
    );
    expect(thumbUpload.status).toBe(201);
    const thumbUploadJson = (await thumbUpload.json()) as { blobId: string; state: string };
    expect(thumbUploadJson.blobId).toBe(thumbBlobId);
    expect(thumbUploadJson.state).toBe('READY');

    // Idempotent retry of thumb upload -> 200
    const thumbRetry = await fetch(
      `${baseUrl}/internal/v1/publications/${revisionId}/blobs/${thumbBlobId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/webp',
          'X-Content-SHA256': thumbSha256,
          Authorization: `Bearer ${PUBLISHER_SECRET}`,
        },
        body: new Uint8Array(thumbBuf),
      },
    );
    expect(thumbRetry.status).toBe(200);

    // 6b. Upload with hash mismatch -> 409 INVALID_MEDIA
    const badHashUpload = await fetch(
      `${baseUrl}/internal/v1/publications/${revisionId}/blobs/${cardBlobId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/webp',
          'X-Content-SHA256': '0'.repeat(64),
          Authorization: `Bearer ${PUBLISHER_SECRET}`,
        },
        body: new Uint8Array(cardBuf),
      },
    );
    expect(badHashUpload.status).toBe(409);

    // 6c. Upload card blob properly -> 201
    const cardUpload = await fetch(
      `${baseUrl}/internal/v1/publications/${revisionId}/blobs/${cardBlobId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/webp',
          'X-Content-SHA256': cardSha256,
          Authorization: `Bearer ${PUBLISHER_SECRET}`,
        },
        body: new Uint8Array(cardBuf),
      },
    );
    expect(cardUpload.status).toBe(201);

    // 6d. Upload game blob properly -> 201
    const gameUpload = await fetch(
      `${baseUrl}/internal/v1/publications/${revisionId}/blobs/${gameBlobId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/webp',
          'X-Content-SHA256': gameSha256,
          Authorization: `Bearer ${PUBLISHER_SECRET}`,
        },
        body: new Uint8Array(gameBuf),
      },
    );
    expect(gameUpload.status).toBe(201);

    // Verify status now has 3 ready blobs, 0 pending
    const statusAllReady = await fetch(`${baseUrl}/internal/v1/publications/${revisionId}`, {
      headers: { Authorization: `Bearer ${PUBLISHER_SECRET}` },
    });
    const statusJson = (await statusAllReady.json()) as typeof stagedPub;
    expect(statusJson.readyBlobs).toBe(3);
    expect(statusJson.pendingBlobIds).toHaveLength(0);

    // 7. Activate Publication (POST /internal/v1/publications/:revisionId/activate)
    const activateRes = await fetch(`${baseUrl}/internal/v1/publications/${revisionId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify({ expectedActiveRevisionId: null }),
    });
    expect(activateRes.status).toBe(200);
    const receipt = (await activateRes.json()) as {
      sessionId: string;
      revisionId: string;
      state: string;
      photoCount: number;
      accessUrl: string;
    };
    expect(receipt.state).toBe('ACTIVE');
    expect(receipt.photoCount).toBe(1);
    expect(receipt.accessUrl).toMatch(/^http:\/\/127\.0\.0\.1\/s\//);

    const publicToken = receipt.accessUrl.split('/s/')[1]!;

    // 8. Public Read Endpoints
    // 8a. GET /s/:token/data
    const sessionDataRes = await fetch(`${baseUrl}/s/${publicToken}/data`);
    expect(sessionDataRes.status).toBe(200);
    const sessionData = (await sessionDataRes.json()) as {
      id: string;
      publicToken: string;
      displayName: string;
      photos: Array<{
        id: string;
        variants: { thumb: string; card: string; game: string };
      }>;
    };
    expect(sessionData.id).toBe(resolvedSession.sessionId);
    expect(sessionData.photos).toHaveLength(1);
    expect(sessionData.photos[0]!.id).toBe('photo-test-01');

    // 8b. GET media derivative /s/:token/media/:revisionId/:photoId/:variant
    const mediaThumbRes = await fetch(
      `${baseUrl}/s/${publicToken}/media/${revisionId}/photo-test-01/thumb`,
    );
    expect(mediaThumbRes.status).toBe(200);
    expect(mediaThumbRes.headers.get('content-type')).toBe('image/webp');
    const receivedThumbBytes = Buffer.from(await mediaThumbRes.arrayBuffer());
    expect(receivedThumbBytes).toEqual(thumbBuf);

    const mediaCardRes = await fetch(
      `${baseUrl}/s/${publicToken}/media/${revisionId}/photo-test-01/card`,
    );
    expect(mediaCardRes.status).toBe(200);
    const receivedCardBytes = Buffer.from(await mediaCardRes.arrayBuffer());
    expect(receivedCardBytes).toEqual(cardBuf);

    // 8c. Stale or invalid media requests -> 404
    const badMediaRes = await fetch(
      `${baseUrl}/s/${publicToken}/media/${revisionId}/nonexistent-photo/thumb`,
    );
    expect(badMediaRes.status).toBe(404);

    // 9. Structured Logs audit
    expect(logs.length).toBeGreaterThan(5);
    const eventNames = logs.map((l) => l.event);
    expect(eventNames).toContain('session_resolved');
    expect(eventNames).toContain('publication_staged');
    expect(eventNames).toContain('blob_uploaded_and_verified');
    expect(eventNames).toContain('publication_activated');
    expect(eventNames).toContain('session_data_served');
    expect(eventNames).toContain('private_media_served');

    // Check no tokens or secrets in logs
    const allLogText = JSON.stringify(logs);
    expect(allLogText).not.toContain(PUBLISHER_SECRET);
    expect(allLogText).not.toContain(SERVER_SECRET);
  });

  it('rejects beginPublication with 404 if sessionId does not exist', async () => {
    const res = await fetch(`${baseUrl}/internal/v1/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify({
        schemaVersion: 1,
        requestId: randomUUID(),
        sessionId: randomUUID(),
        expectedActiveRevisionId: null,
        recipeKey: 'recipe-1-webp82-srgb-inside',
        photos: [
          {
            photoId: 'photo-test',
            contentHash: 'a'.repeat(64),
            sortIndex: 0,
            width: 800,
            height: 600,
            variants: {
              thumb: {
                blobId: randomUUID(),
                sha256: 'b'.repeat(64),
                byteLength: 100,
                width: 480,
                height: 360,
              },
              card: {
                blobId: randomUUID(),
                sha256: 'c'.repeat(64),
                byteLength: 200,
                width: 800,
                height: 600,
              },
              game: {
                blobId: randomUUID(),
                sha256: 'd'.repeat(64),
                byteLength: 300,
                width: 800,
                height: 600,
              },
            },
          },
        ],
      }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('SESSION_NOT_FOUND');
  });

  it('rejects beginPublication with 409 if requestId is reused with different manifest', async () => {
    const crmOrderUuid = randomUUID();
    const resolveRes = await fetch(`${baseUrl}/internal/v1/sessions/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify({ crmOrderUuid }),
    });
    const { sessionId } = (await resolveRes.json()) as { sessionId: string };

    const fixedRequestId = randomUUID();
    const firstManifest = {
      schemaVersion: 1,
      requestId: fixedRequestId,
      sessionId,
      expectedActiveRevisionId: null,
      recipeKey: 'recipe-1-webp82-srgb-inside',
      photos: [
        {
          photoId: 'photo-01',
          contentHash: 'a'.repeat(64),
          sortIndex: 0,
          width: 1000,
          height: 800,
          variants: {
            thumb: {
              blobId: randomUUID(),
              sha256: 'b'.repeat(64),
              byteLength: 100,
              width: 480,
              height: 360,
            },
            card: {
              blobId: randomUUID(),
              sha256: 'c'.repeat(64),
              byteLength: 200,
              width: 800,
              height: 600,
            },
            game: {
              blobId: randomUUID(),
              sha256: 'd'.repeat(64),
              byteLength: 300,
              width: 1000,
              height: 800,
            },
          },
        },
      ],
    };

    const firstRes = await fetch(`${baseUrl}/internal/v1/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify(firstManifest),
    });
    expect(firstRes.status).toBe(201);

    const conflictingManifest = {
      ...firstManifest,
      recipeKey: 'different-recipe-key',
    };

    const conflictRes = await fetch(`${baseUrl}/internal/v1/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify(conflictingManifest),
    });
    expect(conflictRes.status).toBe(409);
    const body = (await conflictRes.json()) as { code: string };
    expect(body.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('rejects beginPublication with 422 if manifest is malformed', async () => {
    const res = await fetch(`${baseUrl}/internal/v1/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify({ invalid: 'garbage' }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('INVALID_MANIFEST');
  });

  it('returns 404 for nonexistent revision in GET /internal/v1/publications/:revisionId', async () => {
    const res = await fetch(`${baseUrl}/internal/v1/publications/${randomUUID()}`, {
      headers: { Authorization: `Bearer ${PUBLISHER_SECRET}` },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('REVISION_NOT_FOUND');
  });

  it('rejects PUT blob exceeding 12 MiB with 413 QUOTA_EXCEEDED', async () => {
    const crmOrderUuid = randomUUID();
    const resolveRes = await fetch(`${baseUrl}/internal/v1/sessions/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify({ crmOrderUuid }),
    });
    const { sessionId } = (await resolveRes.json()) as { sessionId: string };

    const blobId = randomUUID();
    const oversizedBuffer = Buffer.alloc(MAX_BLOB_BYTE_LENGTH + 1);
    const hash = createHash('sha256').update(oversizedBuffer).digest('hex');

    const manifest = {
      schemaVersion: 1,
      requestId: randomUUID(),
      sessionId,
      expectedActiveRevisionId: null,
      recipeKey: 'recipe-1-webp82-srgb-inside',
      photos: [
        {
          photoId: 'photo-large',
          contentHash: 'e'.repeat(64),
          sortIndex: 0,
          width: 800,
          height: 600,
          variants: {
            thumb: { blobId, sha256: hash, byteLength: 1000, width: 480, height: 360 },
            card: {
              blobId: randomUUID(),
              sha256: '1'.repeat(64),
              byteLength: 50,
              width: 800,
              height: 600,
            },
            game: {
              blobId: randomUUID(),
              sha256: '2'.repeat(64),
              byteLength: 50,
              width: 800,
              height: 600,
            },
          },
        },
      ],
    };

    const beginRes = await fetch(`${baseUrl}/internal/v1/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify(manifest),
    });
    const { revisionId } = (await beginRes.json()) as { revisionId: string };

    const uploadRes = await fetch(
      `${baseUrl}/internal/v1/publications/${revisionId}/blobs/${blobId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/webp',
          'X-Content-SHA256': hash,
          Authorization: `Bearer ${PUBLISHER_SECRET}`,
        },
        body: new Uint8Array(oversizedBuffer),
      },
    );
    expect(uploadRes.status).toBe(413);
    const body = (await uploadRes.json()) as { code: string };
    expect(body.code).toBe('QUOTA_EXCEEDED');
  });

  it('returns 404 for nonexistent public token in GET /s/:token/data', async () => {
    const res = await fetch(`${baseUrl}/s/nonexistent-token-12345/data`);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('SESSION_NOT_FOUND');
  });
});
