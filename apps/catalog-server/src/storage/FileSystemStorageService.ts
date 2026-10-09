import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { PublicationDomainError } from '../publication/SessionRepository.js';
import type { VerifiedBlobConfirmation } from '../publication/SessionRepository.js';

export const MAX_BLOB_BYTE_LENGTH = 12 * 1024 * 1024; // 12,582,912 bytes (12 MiB)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface WebpMetadata {
  readonly format: 'VP8' | 'VP8L' | 'VP8X';
  readonly width: number;
  readonly height: number;
}

/**
 * Parses WebP container header and keyframe/extended chunk dimensions
 * according to the official WebP specification without native dependencies.
 */
export function parseWebpMetadata(buf: Buffer): WebpMetadata {
  if (buf.length < 25) {
    throw new PublicationDomainError('INVALID_MEDIA', 'Buffer too small for WebP header');
  }

  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    throw new PublicationDomainError(
      'INVALID_MEDIA',
      'Invalid WebP magic bytes: missing RIFF or WEBP container signature',
    );
  }

  const chunkType = buf.toString('ascii', 12, 16);

  if (chunkType === 'VP8 ') {
    if (buf.length < 30) {
      throw new PublicationDomainError('INVALID_MEDIA', 'Buffer too small for VP8 lossy chunk');
    }
    // VP8 lossy bitstream startcode: 0x9d, 0x01, 0x2a
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) {
      throw new PublicationDomainError('INVALID_MEDIA', 'Invalid VP8 keyframe sync code');
    }
    const width = buf.readUInt16LE(26) & 0x3fff;
    const height = buf.readUInt16LE(28) & 0x3fff;
    if (width <= 0 || height <= 0) {
      throw new PublicationDomainError('INVALID_MEDIA', 'Invalid VP8 dimensions');
    }
    return { format: 'VP8', width, height };
  }

  if (chunkType === 'VP8L') {
    if (buf.length < 25) {
      throw new PublicationDomainError('INVALID_MEDIA', 'Buffer too small for VP8L lossless chunk');
    }
    if (buf[20] !== 0x2f) {
      throw new PublicationDomainError('INVALID_MEDIA', 'Invalid VP8L 1-byte signature');
    }
    const b1 = buf[21]!;
    const b2 = buf[22]!;
    const b3 = buf[23]!;
    const b4 = buf[24]!;
    const width = 1 + (((b2 & 0x3f) << 8) | b1);
    const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
    if (width <= 0 || height <= 0) {
      throw new PublicationDomainError('INVALID_MEDIA', 'Invalid VP8L dimensions');
    }
    return { format: 'VP8L', width, height };
  }

  if (chunkType === 'VP8X') {
    if (buf.length < 30) {
      throw new PublicationDomainError('INVALID_MEDIA', 'Buffer too small for VP8X extended chunk');
    }
    const width = 1 + buf.readUIntLE(24, 3);
    const height = 1 + buf.readUIntLE(27, 3);
    if (width <= 0 || height <= 0) {
      throw new PublicationDomainError('INVALID_MEDIA', 'Invalid VP8X dimensions');
    }
    return { format: 'VP8X', width, height };
  }

  throw new PublicationDomainError(
    'INVALID_MEDIA',
    `Unsupported or unrecognized WebP chunk type: ${chunkType}`,
  );
}

export interface StoreBlobParams {
  readonly revisionId: string;
  readonly blobId: string;
  readonly expectedSha256: string;
  readonly expectedByteLength?: number;
  readonly expectedWidth?: number;
  readonly expectedHeight?: number;
}

export interface StorageService {
  storeBlob(data: Readable | Buffer, params: StoreBlobParams): Promise<VerifiedBlobConfirmation>;
  hasBlob(revisionId: string, blobId: string, expectedSha256?: string, expectedBytes?: number): Promise<boolean>;
  getBlobPath(revisionId: string, blobId: string): string;
  getBlobStream(
    revisionId: string,
    blobId: string,
  ): Promise<{ stream: Readable; byteLength: number } | null>;
  deleteRevisionBlobs(revisionId: string): Promise<void>;
}

export class FileSystemStorageService implements StorageService {
  private readonly storageDir: string;

  constructor(dependencies: { storageDir: string }) {
    this.storageDir = resolve(dependencies.storageDir);
  }

  getBlobPath(revisionId: string, blobId: string): string {
    this.assertValidIds(revisionId, blobId);
    return resolve(this.storageDir, 'blobs', revisionId, `${blobId}.webp`);
  }

  async hasBlob(
    revisionId: string,
    blobId: string,
    expectedSha256?: string,
    expectedBytes?: number,
  ): Promise<boolean> {
    try {
      const filePath = this.getBlobPath(revisionId, blobId);
      const fileStat = await stat(filePath);
      if (!fileStat.isFile() || (expectedBytes !== undefined && fileStat.size !== expectedBytes)) {
        return false;
      }
      if (expectedSha256 === undefined) return true;
      const hash = createHash('sha256');
      for await (const chunk of createReadStream(filePath)) hash.update(chunk);
      return hash.digest('hex') === expectedSha256.toLowerCase();
    } catch {
      return false;
    }
  }

  async getBlobStream(
    revisionId: string,
    blobId: string,
  ): Promise<{ stream: Readable; byteLength: number } | null> {
    try {
      const p = this.getBlobPath(revisionId, blobId);
      const st = await stat(p);
      return {
        stream: createReadStream(p),
        byteLength: st.size,
      };
    } catch {
      return null;
    }
  }

  async deleteRevisionBlobs(revisionId: string): Promise<void> {
    if (!UUID_PATTERN.test(revisionId)) {
      throw new PublicationDomainError('INVALID_MEDIA', 'Invalid revisionId');
    }
    const revisionDir = resolve(this.storageDir, 'blobs', revisionId);
    await rm(revisionDir, { recursive: true, force: true });
  }

  async storeBlob(
    data: Readable | Buffer,
    params: StoreBlobParams,
  ): Promise<VerifiedBlobConfirmation> {
    this.assertValidIds(params.revisionId, params.blobId);

    const finalPath = this.getBlobPath(params.revisionId, params.blobId);
    const parentDir = dirname(finalPath);
    await mkdir(parentDir, { recursive: true });

    // Check if the exact blob is already on disk with matching sha256
    try {
      const existingStat = await stat(finalPath);
      if (
        params.expectedByteLength === undefined ||
        existingStat.size === params.expectedByteLength
      ) {
        const existingBytes = await readFile(finalPath);
        const existingHash = createHash('sha256').update(existingBytes).digest('hex');
        if (existingHash.toLowerCase() === params.expectedSha256.toLowerCase()) {
          const meta = parseWebpMetadata(existingBytes);
          return {
            revisionId: params.revisionId,
            blobId: params.blobId,
            sha256: existingHash,
            byteLength: existingBytes.length,
            width: meta.width,
            height: meta.height,
            storageConfirmed: true,
          };
        }
      }
    } catch {
      // File does not exist, proceed with new write
    }

    const tempPath = resolve(parentDir, `${params.blobId}.tmp.${randomUUID()}`);

    try {
      if (Buffer.isBuffer(data)) {
        await this.writeBuffer(data, tempPath);
      } else {
        await this.writeStream(data, tempPath);
      }

      // Read back stored file to inspect and verify
      const storedBytes = await readFile(tempPath);
      const byteLength = storedBytes.length;

      if (byteLength > MAX_BLOB_BYTE_LENGTH) {
        throw new PublicationDomainError(
          'QUOTA_EXCEEDED',
          `Blob size ${byteLength} exceeds maximum allowed size of 12 MiB`,
        );
      }

      if (params.expectedByteLength !== undefined && byteLength !== params.expectedByteLength) {
        throw new PublicationDomainError(
          'INVALID_MEDIA',
          `Blob byte length ${byteLength} does not match expected length ${params.expectedByteLength}`,
        );
      }

      const computedSha256 = createHash('sha256').update(storedBytes).digest('hex');
      if (computedSha256.toLowerCase() !== params.expectedSha256.toLowerCase()) {
        throw new PublicationDomainError(
          'INVALID_MEDIA',
          `Blob SHA-256 hash ${computedSha256} does not match expected ${params.expectedSha256}`,
        );
      }

      const metadata = parseWebpMetadata(storedBytes);

      if (params.expectedWidth !== undefined && metadata.width !== params.expectedWidth) {
        throw new PublicationDomainError(
          'INVALID_MEDIA',
          `WebP width ${metadata.width} does not match expected width ${params.expectedWidth}`,
        );
      }

      if (params.expectedHeight !== undefined && metadata.height !== params.expectedHeight) {
        throw new PublicationDomainError(
          'INVALID_MEDIA',
          `WebP height ${metadata.height} does not match expected height ${params.expectedHeight}`,
        );
      }

      // Atomic promote: rename temp file to final destination
      await rename(tempPath, finalPath);

      return {
        revisionId: params.revisionId,
        blobId: params.blobId,
        sha256: computedSha256,
        byteLength,
        width: metadata.width,
        height: metadata.height,
        storageConfirmed: true,
      };
    } catch (error) {
      await unlink(tempPath).catch(() => undefined);
      throw error;
    }
  }

  private async writeBuffer(buf: Buffer, tempPath: string): Promise<void> {
    if (buf.length > MAX_BLOB_BYTE_LENGTH) {
      throw new PublicationDomainError(
        'QUOTA_EXCEEDED',
        `Blob size ${buf.length} exceeds maximum allowed size of 12 MiB`,
      );
    }
    await writeFile(tempPath, buf);
  }

  private async writeStream(stream: Readable, tempPath: string): Promise<void> {
    let bytesReceived = 0;
    const writeStream = createWriteStream(tempPath);

    stream.on('data', (chunk: Buffer) => {
      bytesReceived += chunk.length;
      if (bytesReceived > MAX_BLOB_BYTE_LENGTH) {
        stream.destroy(
          new PublicationDomainError(
            'QUOTA_EXCEEDED',
            `Stream exceeded maximum allowed size of 12 MiB`,
          ),
        );
      }
    });

    await pipeline(stream, writeStream);
  }

  private assertValidIds(revisionId: string, blobId: string): void {
    if (!UUID_PATTERN.test(revisionId)) {
      throw new PublicationDomainError('INVALID_MEDIA', 'revisionId must be a valid UUID');
    }
    if (!UUID_PATTERN.test(blobId)) {
      throw new PublicationDomainError('INVALID_MEDIA', 'blobId must be a valid UUID');
    }
  }
}
