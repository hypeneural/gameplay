import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  FileSystemStorageService,
  MAX_BLOB_BYTE_LENGTH,
  parseWebpMetadata,
} from './FileSystemStorageService.js';
import { PublicationDomainError } from '../publication/SessionRepository.js';

/**
 * Builds a valid minimal VP8 WebP buffer with specified dimensions.
 */
function createSyntheticVp8Webp(width: number, height: number): Buffer {
  // VP8 keyframe header is 10 bytes:
  // 3 bytes frame tag
  // 3 bytes sync code: 0x9d, 0x01, 0x2a
  // 2 bytes width & 0x3fff
  // 2 bytes height & 0x3fff
  const vp8Payload = Buffer.alloc(10);
  vp8Payload[0] = 0x00; // keyframe
  vp8Payload[1] = 0x00;
  vp8Payload[2] = 0x00;
  vp8Payload[3] = 0x9d;
  vp8Payload[4] = 0x01;
  vp8Payload[5] = 0x2a;
  vp8Payload.writeUInt16LE(width & 0x3fff, 6);
  vp8Payload.writeUInt16LE(height & 0x3fff, 8);

  const vp8ChunkSize = vp8Payload.length;
  const riffSize = 4 + 8 + vp8ChunkSize; // 'WEBP' (4) + 'VP8 ' (4) + chunkSize (4) + payload

  const buffer = Buffer.alloc(8 + riffSize);
  buffer.write('RIFF', 0, 4, 'ascii');
  buffer.writeUInt32LE(riffSize, 4);
  buffer.write('WEBP', 8, 4, 'ascii');
  buffer.write('VP8 ', 12, 4, 'ascii');
  buffer.writeUInt32LE(vp8ChunkSize, 16);
  vp8Payload.copy(buffer, 20);

  return buffer;
}

/**
 * Builds a valid minimal VP8L lossless WebP buffer with specified dimensions.
 */
function createSyntheticVp8LWebp(width: number, height: number): Buffer {
  const w = width - 1;
  const h = height - 1;
  const b1 = w & 0xff;
  const b2 = ((w >> 8) & 0x3f) | ((h & 0x03) << 6);
  const b3 = (h >> 2) & 0xff;
  const b4 = (h >> 10) & 0x0f;

  const vp8lPayload = Buffer.from([0x2f, b1, b2, b3, b4]);
  const vp8lChunkSize = vp8lPayload.length;
  const riffSize = 4 + 8 + vp8lChunkSize;

  const buffer = Buffer.alloc(8 + riffSize);
  buffer.write('RIFF', 0, 4, 'ascii');
  buffer.writeUInt32LE(riffSize, 4);
  buffer.write('WEBP', 8, 4, 'ascii');
  buffer.write('VP8L', 12, 4, 'ascii');
  buffer.writeUInt32LE(vp8lChunkSize, 16);
  vp8lPayload.copy(buffer, 20);

  return buffer;
}

describe('FileSystemStorageService & parseWebpMetadata', () => {
  let testDir: string;
  let storage: FileSystemStorageService;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'storage-test-'));
    storage = new FileSystemStorageService({ storageDir: testDir });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('parseWebpMetadata', () => {
    it('parses VP8 lossy header dimensions correctly', () => {
      const buf = createSyntheticVp8Webp(800, 600);
      const meta = parseWebpMetadata(buf);
      expect(meta).toEqual({ format: 'VP8', width: 800, height: 600 });
    });

    it('parses VP8L lossless header dimensions correctly', () => {
      const buf = createSyntheticVp8LWebp(480, 320);
      const meta = parseWebpMetadata(buf);
      expect(meta).toEqual({ format: 'VP8L', width: 480, height: 320 });
    });

    it('rejects non-WebP signatures', () => {
      const badBuf = Buffer.alloc(40);
      badBuf.write('GIF89a', 0, 6, 'ascii');
      expect(() => parseWebpMetadata(badBuf)).toThrowError(PublicationDomainError);
    });

    it('rejects truncated buffers', () => {
      const tinyBuf = Buffer.from('RIFF');
      expect(() => parseWebpMetadata(tinyBuf)).toThrowError(PublicationDomainError);
    });
  });

  describe('storeBlob', () => {
    const revisionId = randomUUID();
    const blobId = randomUUID();

    it('stores a valid WebP buffer and returns verified confirmation', async () => {
      const webp = createSyntheticVp8Webp(800, 600);
      const sha256 = createHash('sha256').update(webp).digest('hex');

      const result = await storage.storeBlob(webp, {
        revisionId,
        blobId,
        expectedSha256: sha256,
        expectedByteLength: webp.length,
        expectedWidth: 800,
        expectedHeight: 600,
      });

      expect(result).toEqual({
        revisionId,
        blobId,
        sha256,
        byteLength: webp.length,
        width: 800,
        height: 600,
        storageConfirmed: true,
      });

      expect(await storage.hasBlob(revisionId, blobId)).toBe(true);
      const streamResult = await storage.getBlobStream(revisionId, blobId);
      expect(streamResult).not.toBeNull();
      expect(streamResult?.byteLength).toBe(webp.length);
    });

    it('stores a valid WebP from a Readable stream', async () => {
      const webp = createSyntheticVp8Webp(480, 360);
      const sha256 = createHash('sha256').update(webp).digest('hex');
      const stream = Readable.from([webp]);

      const result = await storage.storeBlob(stream, {
        revisionId,
        blobId,
        expectedSha256: sha256,
        expectedByteLength: webp.length,
        expectedWidth: 480,
        expectedHeight: 360,
      });

      expect(result.storageConfirmed).toBe(true);
      expect(result.sha256).toBe(sha256);
      expect(result.width).toBe(480);
      expect(result.height).toBe(360);
    });

    it('rejects when SHA-256 hash does not match', async () => {
      const webp = createSyntheticVp8Webp(800, 600);
      const wrongSha256 = '0'.repeat(64);

      await expect(
        storage.storeBlob(webp, {
          revisionId,
          blobId,
          expectedSha256: wrongSha256,
        }),
      ).rejects.toThrowError(PublicationDomainError);

      expect(await storage.hasBlob(revisionId, blobId)).toBe(false);
    });

    it('rejects when dimensions do not match', async () => {
      const webp = createSyntheticVp8Webp(800, 600);
      const sha256 = createHash('sha256').update(webp).digest('hex');

      await expect(
        storage.storeBlob(webp, {
          revisionId,
          blobId,
          expectedSha256: sha256,
          expectedWidth: 1024,
          expectedHeight: 768,
        }),
      ).rejects.toThrowError(PublicationDomainError);

      expect(await storage.hasBlob(revisionId, blobId)).toBe(false);
    });

    it('rejects blobs exceeding maximum size quota', async () => {
      const largeBuffer = Buffer.alloc(MAX_BLOB_BYTE_LENGTH + 1);

      await expect(
        storage.storeBlob(largeBuffer, {
          revisionId,
          blobId,
          expectedSha256: 'a'.repeat(64),
        }),
      ).rejects.toThrowError(/exceeds maximum allowed size/);
    });

    it('rejects invalid revisionId or blobId to prevent traversal', async () => {
      const webp = createSyntheticVp8Webp(800, 600);
      const sha256 = createHash('sha256').update(webp).digest('hex');

      await expect(
        storage.storeBlob(webp, {
          revisionId: '../../etc',
          blobId,
          expectedSha256: sha256,
        }),
      ).rejects.toThrowError(PublicationDomainError);
    });

    it('is idempotent when re-storing identical blob', async () => {
      const webp = createSyntheticVp8Webp(800, 600);
      const sha256 = createHash('sha256').update(webp).digest('hex');

      const first = await storage.storeBlob(webp, {
        revisionId,
        blobId,
        expectedSha256: sha256,
      });

      const second = await storage.storeBlob(webp, {
        revisionId,
        blobId,
        expectedSha256: sha256,
      });

      expect(first).toEqual(second);
    });

    it('deletes all blobs in a revision on cleanup', async () => {
      const webp = createSyntheticVp8Webp(800, 600);
      const sha256 = createHash('sha256').update(webp).digest('hex');

      await storage.storeBlob(webp, {
        revisionId,
        blobId,
        expectedSha256: sha256,
      });

      expect(await storage.hasBlob(revisionId, blobId)).toBe(true);
      await storage.deleteRevisionBlobs(revisionId);
      expect(await storage.hasBlob(revisionId, blobId)).toBe(false);
    });
  });
});
