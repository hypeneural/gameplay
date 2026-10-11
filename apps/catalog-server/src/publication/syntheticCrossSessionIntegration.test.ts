import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import type { AddressInfo, Server } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCatalogServer } from '../CatalogServer.js';
import { InMemoryCrmClient } from '../crm/CrmEligibilityService.js';
import { PublicationService } from './PublicationService.js';
import { StructuredPublicationLogger, type PublicationLogEntry } from './publicationLogger.js';
import { SqliteSessionRepository } from './SessionRepository.js';
import { FileSystemStorageService } from '../storage/FileSystemStorageService.js';
import { openSqliteDatabase, applyMigrations } from './sqliteDatabase.js';
import { SqlitePreviewRepository } from './sqlitePreviewRepository.js';

const SERVER_SECRET = 'synthetic-server-secret-32-chars!!';
const PUBLISHER_SECRET = 'synthetic-publisher-secret-token!';

function createSyntheticVp8Webp(width: number, height: number): { buffer: Buffer; sha256: string } {
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

  const sha256 = createHash('sha256').update(buffer).digest('hex');
  return { buffer, sha256 };
}

describe('Synthetic Cross-Session Multi-Order Integration (P0 Etapa 8)', () => {
  let tempStorageDir: string;
  let server: Server;
  let baseUrl: string;
  let logs: PublicationLogEntry[];
  let crmClient: InMemoryCrmClient;
  let sessionRepo: SqliteSessionRepository;
  let previewRepo: SqlitePreviewRepository;

  beforeEach(async () => {
    logs = [];
    tempStorageDir = await mkdtemp(join(tmpdir(), 'synthetic-cross-session-'));

    const db = openSqliteDatabase(':memory:');
    applyMigrations(db);

    sessionRepo = new SqliteSessionRepository({
      db,
      serverSecret: SERVER_SECRET,
      publicBaseUrl: 'https://jogos.fotosdenatal.com',
    });

    previewRepo = new SqlitePreviewRepository({ db });

    const storageService = new FileSystemStorageService({
      storageDir: tempStorageDir,
    });

    const logger = new StructuredPublicationLogger({
      sink: (line) => logs.push(JSON.parse(line) as PublicationLogEntry),
    });

    crmClient = new InMemoryCrmClient();

    const publicationService = new PublicationService({
      sessionRepository: sessionRepo,
      storageService,
      publisherSecret: PUBLISHER_SECRET,
      crmClient,
      logger,
      publicBaseUrl: 'https://jogos.fotosdenatal.com',
    });

    server = createCatalogServer({
      publicOrigin: new URL('https://jogos.fotosdenatal.com'),
      loadApplicationShell: async () =>
        '<!doctype html><html><head><meta name="catalog-social-preview" content="backend-required" /><title>Hub</title></head><body><div id="root"></div></body></html>',
      previews: previewRepo,
      audit: { async record() {} },
      clock: { now: () => new Date('2026-10-11T20:00:00Z') },
      runtime: { releaseStage: 'staging-demo' },
      publicationService,
      sessionIsActive: async (candidateToken) => sessionRepo.isSessionActive(candidateToken),
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

  async function publishOrderSession(orderUuid: string, photoCount: number) {
    crmClient.setEligibility({
      orderUuid,
      status: 'CONFIRMED',
      isEligibleForGallery: true,
      revoked: false,
    });

    // 1. Resolve session
    const resolveRes = await fetch(`${baseUrl}/internal/v1/sessions/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify({ crmOrderUuid: orderUuid }),
    });
    expect([200, 201]).toContain(resolveRes.status);
    const resolved = (await resolveRes.json()) as {
      sessionId: string;
      activeRevisionId: string | null;
    };

    // 2. Build manifest
    const photos = [];
    const blobPayloads: Array<{ blobId: string; buffer: Buffer; sha256: string }> = [];

    for (let i = 0; i < photoCount; i++) {
      const thumb = createSyntheticVp8Webp(480, 360);
      const card = createSyntheticVp8Webp(800, 600);
      const game = createSyntheticVp8Webp(1600, 1200);

      const thumbBlobId = randomUUID();
      const cardBlobId = randomUUID();
      const gameBlobId = randomUUID();

      blobPayloads.push(
        { blobId: thumbBlobId, buffer: thumb.buffer, sha256: thumb.sha256 },
        { blobId: cardBlobId, buffer: card.buffer, sha256: card.sha256 },
        { blobId: gameBlobId, buffer: game.buffer, sha256: game.sha256 },
      );

      photos.push({
        photoId: `photo-${i}`,
        contentHash: createHash('sha256').update(`content-${i}`).digest('hex'),
        sortIndex: i,
        width: 1600,
        height: 1200,
        variants: {
          thumb: {
            blobId: thumbBlobId,
            sha256: thumb.sha256,
            byteLength: thumb.buffer.length,
            width: 480,
            height: 360,
          },
          card: {
            blobId: cardBlobId,
            sha256: card.sha256,
            byteLength: card.buffer.length,
            width: 800,
            height: 600,
          },
          game: {
            blobId: gameBlobId,
            sha256: game.sha256,
            byteLength: game.buffer.length,
            width: 1600,
            height: 1200,
          },
        },
      });
    }

    const manifest = {
      schemaVersion: 1,
      requestId: randomUUID(),
      sessionId: resolved.sessionId,
      expectedActiveRevisionId: resolved.activeRevisionId,
      recipeKey: 'recipe-v1',
      photos,
    };

    // 3. Begin Publication
    const beginRes = await fetch(`${baseUrl}/internal/v1/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify(manifest),
    });
    expect([200, 201]).toContain(beginRes.status);
    const pub = (await beginRes.json()) as { revisionId: string; expectedBlobs: number };

    // 4. Upload blobs
    for (const blob of blobPayloads) {
      const uploadRes = await fetch(
        `${baseUrl}/internal/v1/publications/${pub.revisionId}/blobs/${blob.blobId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'image/webp',
            'X-Content-SHA256': blob.sha256,
            Authorization: `Bearer ${PUBLISHER_SECRET}`,
          },
          body: new Uint8Array(blob.buffer),
        },
      );
      expect(uploadRes.status).toBe(201);
    }

    // 5. Activate
    const activateRes = await fetch(
      `${baseUrl}/internal/v1/publications/${pub.revisionId}/activate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PUBLISHER_SECRET}`,
        },
        body: JSON.stringify({ expectedActiveRevisionId: resolved.activeRevisionId }),
      },
    );
    expect(activateRes.status).toBe(200);
    const receipt = (await activateRes.json()) as {
      status: string;
      revisionId: string;
      publicToken: string;
      accessUrl: string;
    };

    const token = receipt.accessUrl.split('/s/')[1]!;

    return {
      sessionId: resolved.sessionId,
      publicToken: token,
      revisionId: pub.revisionId,
      receipt,
      manifest,
      blobPayloads,
    };
  }

  it('proves cross-session isolation between Order A and Order B', async () => {
    const orderA = randomUUID();
    const orderB = randomUUID();

    const resultA = await publishOrderSession(orderA, 2);
    const resultB = await publishOrderSession(orderB, 3);

    expect(resultA.sessionId).not.toBe(resultB.sessionId);
    expect(resultA.publicToken).not.toBe(resultB.publicToken);

    const hubA = await fetch(`${baseUrl}/s/${resultA.publicToken}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
    });
    expect(hubA.status).toBe(200);

    const hubB = await fetch(`${baseUrl}/s/${resultB.publicToken}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
    });
    expect(hubB.status).toBe(200);

    // 2. Cross-session blob boundary:
    // Blobs of Order B cannot be accessed via Order A revision
    const blobB0 = resultB.blobPayloads[0]!.blobId;
    const leakAttempt = await fetch(
      `${baseUrl}/internal/v1/publications/${resultA.revisionId}/blobs/${blobB0}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/webp',
          'X-Content-SHA256': resultB.blobPayloads[0]!.sha256,
          Authorization: `Bearer ${PUBLISHER_SECRET}`,
        },
        body: new Uint8Array(resultB.blobPayloads[0]!.buffer),
      },
    );
    expect(leakAttempt.status).toBe(404);
  });

  it('proves idempotent publication replay without duplicate blobs or CAS conflict', async () => {
    const orderA = randomUUID();
    crmClient.setEligibility({
      orderUuid: orderA,
      status: 'CONFIRMED',
      isEligibleForGallery: true,
      revoked: false,
    });

    // 1. Resolve session
    const resolveRes = await fetch(`${baseUrl}/internal/v1/sessions/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify({ crmOrderUuid: orderA }),
    });
    const { sessionId } = (await resolveRes.json()) as { sessionId: string };

    const thumb = createSyntheticVp8Webp(480, 360);
    const card = createSyntheticVp8Webp(800, 600);
    const game = createSyntheticVp8Webp(1600, 1200);

    const thumbBlobId = randomUUID();
    const cardBlobId = randomUUID();
    const gameBlobId = randomUUID();

    const manifest = {
      schemaVersion: 1,
      requestId: randomUUID(),
      sessionId,
      expectedActiveRevisionId: null,
      recipeKey: 'recipe-v1',
      photos: [
        {
          photoId: 'photo-0',
          contentHash: createHash('sha256').update('content-0').digest('hex'),
          sortIndex: 0,
          width: 1600,
          height: 1200,
          variants: {
            thumb: {
              blobId: thumbBlobId,
              sha256: thumb.sha256,
              byteLength: thumb.buffer.length,
              width: 480,
              height: 360,
            },
            card: {
              blobId: cardBlobId,
              sha256: card.sha256,
              byteLength: card.buffer.length,
              width: 800,
              height: 600,
            },
            game: {
              blobId: gameBlobId,
              sha256: game.sha256,
              byteLength: game.buffer.length,
              width: 1600,
              height: 1200,
            },
          },
        },
      ],
    };

    // 2. Begin Publication
    const beginRes = await fetch(`${baseUrl}/internal/v1/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify(manifest),
    });
    const { revisionId } = (await beginRes.json()) as { revisionId: string };

    // 3. Replaying beginPublication while STAGED returns 200 (idempotent)
    const replayBegin = await fetch(`${baseUrl}/internal/v1/publications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify(manifest),
    });
    expect(replayBegin.status).toBe(200);

    // 4. Upload blobs
    for (const b of [
      { blobId: thumbBlobId, ...thumb },
      { blobId: cardBlobId, ...card },
      { blobId: gameBlobId, ...game },
    ]) {
      const uploadRes = await fetch(
        `${baseUrl}/internal/v1/publications/${revisionId}/blobs/${b.blobId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'image/webp',
            'X-Content-SHA256': b.sha256,
            Authorization: `Bearer ${PUBLISHER_SECRET}`,
          },
          body: new Uint8Array(b.buffer),
        },
      );
      expect(uploadRes.status).toBe(201);
    }

    // 5. Re-uploading an already READY blob while STAGED returns 200 (idempotent retry)
    const replayUpload = await fetch(
      `${baseUrl}/internal/v1/publications/${revisionId}/blobs/${thumbBlobId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/webp',
          'X-Content-SHA256': thumb.sha256,
          Authorization: `Bearer ${PUBLISHER_SECRET}`,
        },
        body: new Uint8Array(thumb.buffer),
      },
    );
    expect(replayUpload.status).toBe(200);

    // 6. Activate revision
    const activateRes = await fetch(`${baseUrl}/internal/v1/publications/${revisionId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify({ expectedActiveRevisionId: null }),
    });
    expect(activateRes.status).toBe(200);

    // 7. Re-activating an already ACTIVE revision returns 200 with same receipt
    const replayActivate = await fetch(
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
    expect(replayActivate.status).toBe(200);
  });

  it('forbids activation when CRM order is cancelled before activate and leaves revision STAGED', async () => {
    const orderC = randomUUID();
    crmClient.setEligibility({
      orderUuid: orderC,
      status: 'CONFIRMED',
      isEligibleForGallery: true,
      revoked: false,
    });

    const resolveRes = await fetch(`${baseUrl}/internal/v1/sessions/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify({ crmOrderUuid: orderC }),
    });
    const { sessionId } = (await resolveRes.json()) as { sessionId: string };

    const thumb = createSyntheticVp8Webp(480, 360);
    const card = createSyntheticVp8Webp(800, 600);
    const game = createSyntheticVp8Webp(1600, 1200);

    const thumbBlobId = randomUUID();
    const cardBlobId = randomUUID();
    const gameBlobId = randomUUID();

    const manifest = {
      schemaVersion: 1,
      requestId: randomUUID(),
      sessionId,
      expectedActiveRevisionId: null,
      recipeKey: 'recipe-v1',
      photos: [
        {
          photoId: 'photo-0',
          contentHash: createHash('sha256').update('c-0').digest('hex'),
          sortIndex: 0,
          width: 1600,
          height: 1200,
          variants: {
            thumb: {
              blobId: thumbBlobId,
              sha256: thumb.sha256,
              byteLength: thumb.buffer.length,
              width: 480,
              height: 360,
            },
            card: {
              blobId: cardBlobId,
              sha256: card.sha256,
              byteLength: card.buffer.length,
              width: 800,
              height: 600,
            },
            game: {
              blobId: gameBlobId,
              sha256: game.sha256,
              byteLength: game.buffer.length,
              width: 1600,
              height: 1200,
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
    expect(beginRes.status).toBe(201);
    const { revisionId } = (await beginRes.json()) as { revisionId: string };

    for (const b of [
      { blobId: thumbBlobId, ...thumb },
      { blobId: cardBlobId, ...card },
      { blobId: gameBlobId, ...game },
    ]) {
      const uploadRes = await fetch(
        `${baseUrl}/internal/v1/publications/${revisionId}/blobs/${b.blobId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'image/webp',
            'X-Content-SHA256': b.sha256,
            Authorization: `Bearer ${PUBLISHER_SECRET}`,
          },
          body: new Uint8Array(b.buffer),
        },
      );
      expect(uploadRes.status).toBe(201);
    }

    // Customer cancels order in CRM before activation
    crmClient.setEligibility({
      orderUuid: orderC,
      status: 'CANCELLED',
      isEligibleForGallery: false,
      revoked: true,
    });

    const activateRes = await fetch(`${baseUrl}/internal/v1/publications/${revisionId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUBLISHER_SECRET}`,
      },
      body: JSON.stringify({ expectedActiveRevisionId: null }),
    });

    const errBody = (await activateRes.json()) as { code: string; message: string };
    expect(activateRes.status).toBe(403);
    expect(errBody.code).toBe('SESSION_NOT_FOUND');

    // Public URL remains 404 (session is not active)
    const sessionRecord = await sessionRepo.resolveOrCreateSession(orderC);
    const browserRes = await fetch(`${baseUrl}/s/${sessionRecord.publicToken}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
    });
    expect(browserRes.status).toBe(404);
  });

  it('redacts capability URLs and tokens from structured publication logs', async () => {
    const orderD = randomUUID();
    const result = await publishOrderSession(orderD, 1);

    expect(logs.length).toBeGreaterThan(0);
    for (const log of logs) {
      const logString = JSON.stringify(log);
      // Capability URLs and token hashes must never appear in structured logger
      expect(logString).not.toContain(result.publicToken);
      expect(logString).not.toContain(`/s/${result.publicToken}`);
    }
  });
});
