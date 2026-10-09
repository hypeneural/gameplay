import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { publishSession } from './publish-session.mjs';

function createMockCatalogServer() {
  const blobsReceived = new Map();
  let sessionResolved = false;
  let publicationCreated = false;
  let revisionActivated = false;

  const server = createServer(async (req, res) => {
    const auth = req.headers['authorization'];
    if (auth !== 'Bearer test-secret-token') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    const url = new URL(req.url ?? '/', 'http://127.0.0.1');

    if (req.method === 'POST' && url.pathname === '/internal/v1/sessions/resolve') {
      sessionResolved = true;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          sessionId: '11111111-1111-4111-8111-111111111111',
          activeRevisionId: null,
          status: 'ACTIVE',
          publicToken: 'test-public-token-1234567890123456',
        }),
      );
      return;
    }

    if (req.method === 'POST' && url.pathname === '/internal/v1/publications') {
      publicationCreated = true;
      let body = '';
      for await (const chunk of req) body += chunk;
      const manifest = JSON.parse(body);
      const pendingBlobIds = [];
      for (const photo of manifest.photos) {
        for (const variant of Object.values(photo.variants)) {
          pendingBlobIds.push(variant.blobId);
        }
      }

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          revisionId: '22222222-2222-4222-8222-222222222222',
          state: 'STAGED',
          expectedBlobs: pendingBlobIds.length,
          readyBlobs: 0,
          pendingBlobIds,
        }),
      );
      return;
    }

    if (req.method === 'PUT' && url.pathname.includes('/blobs/')) {
      const parts = url.pathname.split('/');
      const blobId = parts[parts.length - 1];
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const full = Buffer.concat(chunks);
      blobsReceived.set(blobId, full);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          blobId,
          revisionId: '22222222-2222-4222-8222-222222222222',
          storageConfirmed: true,
        }),
      );
      return;
    }

    if (
      req.method === 'GET' &&
      url.pathname === '/internal/v1/publications/22222222-2222-4222-8222-222222222222'
    ) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          revisionId: '22222222-2222-4222-8222-222222222222',
          state: 'STAGED',
          expectedBlobs: blobsReceived.size,
          readyBlobs: blobsReceived.size,
          pendingBlobIds: [],
        }),
      );
      return;
    }

    if (
      req.method === 'POST' &&
      url.pathname === '/internal/v1/publications/22222222-2222-4222-8222-222222222222/activate'
    ) {
      revisionActivated = true;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ACTIVE',
          revisionId: '22222222-2222-4222-8222-222222222222',
          publicToken: 'test-public-token-1234567890123456',
          accessUrl: 'https://jogos.fotosdenatal.com/s/test-public-token-1234567890123456',
          activatedAt: new Date().toISOString(),
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end();
  });

  return {
    server,
    getStats: () => ({
      sessionResolved,
      publicationCreated,
      revisionActivated,
      blobsCount: blobsReceived.size,
    }),
  };
}

describe('publish-session CLI', () => {
  it('uploads all variants and activates publication end to end', async () => {
    const { server, getStats } = createMockCatalogServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const apiOrigin = `http://127.0.0.1:${port}`;

    const tempDir = await mkdtemp(join(tmpdir(), 'publish-test-'));

    try {
      const derivedDir = join(tempDir, 'derived', 'photo-1');
      await mkdir(derivedDir, { recursive: true });

      await writeFile(join(derivedDir, 'thumb.webp'), Buffer.from('RIFF....WEBPTHUMB'));
      await writeFile(join(derivedDir, 'card.webp'), Buffer.from('RIFF....WEBPCARD'));
      await writeFile(join(derivedDir, 'game.webp'), Buffer.from('RIFF....WEBPGAME'));

      const config = {
        version: 2,
        worker: 'test-worker',
        session: {
          id: 'test-session',
          publicToken: 'test-token',
          displayName: 'Test Session',
        },
        photos: [
          {
            id: 'photo-1',
            contentHash: 'a'.repeat(64),
            width: 800,
            height: 600,
            aspectRatio: 1.333,
            orientation: 'landscape',
            variantMetrics: {
              thumb: { width: 360, height: 480, byteLength: 17 },
              card: { width: 600, height: 800, byteLength: 16 },
              game: { width: 800, height: 600, byteLength: 16 },
            },
          },
        ],
      };

      await writeFile(join(tempDir, 'local-test-session.json'), JSON.stringify(config, null, 2));

      const receipt = await publishSession({
        storageRoot: tempDir,
        apiOrigin,
        apiSecret: 'test-secret-token',
        crmOrderUuid: '33333333-3333-4333-8333-333333333333',
      });

      expect(receipt.status).toBe('ACTIVE');
      expect(receipt.photosCount).toBe(1);
      expect(receipt.blobsCount).toBe(3);
      expect(receipt.publicToken).toBe('test-public-token-1234567890123456');

      const stats = getStats();
      expect(stats.sessionResolved).toBe(true);
      expect(stats.publicationCreated).toBe(true);
      expect(stats.revisionActivated).toBe(true);
      expect(stats.blobsCount).toBe(3);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects invalid CRM order UUID', async () => {
    await expect(
      publishSession({
        storageRoot: '/tmp',
        apiOrigin: 'http://127.0.0.1:4180',
        apiSecret: 'secret',
        crmOrderUuid: 'invalid-not-a-uuid',
      }),
    ).rejects.toThrow(/Invalid CRM order UUID/);
  });
});
