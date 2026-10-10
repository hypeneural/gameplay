import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { generatePrivateSocialCover } from './socialCover.js';

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createInput(): Promise<{ root: string; input: string; storage: string }> {
  const root = await mkdtemp(join(tmpdir(), 'evydencia-og-'));
  cleanup.push(root);
  const input = join(root, 'synthetic-photo.png');
  await sharp({
    create: { width: 1600, height: 1200, channels: 3, background: '#c78b57' },
  })
    .png()
    .toFile(input);
  return { root, input, storage: join(root, 'private-og') };
}

describe('private JPEG Open Graph composition', () => {
  it('produces a bounded 1200x630 EXIF-free JPEG under private output only', async () => {
    const { input, storage } = await createInput();
    const result = await generatePrivateSocialCover({
      sourceImagePath: input,
      privateOutputDirectory: storage,
      derivativeKey: 'opaque-social-demo-12345',
      socialPreviewConsent: 'granted',
    });
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.width).toBe(1200);
    expect(result.height).toBe(630);
    expect(result.byteLength).toBeLessThanOrEqual(300 * 1024);
    const bytes = await readFile(result.privateFilePath);
    expect([...bytes.subarray(0, 2)]).toEqual([255, 216]);
    const metadata = await sharp(bytes).metadata();
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
    expect(metadata.exif).toBeUndefined();
  });

  it('rejects absent consent and any attempt to write inside repository', async () => {
    const { input, storage } = await createInput();
    await expect(
      generatePrivateSocialCover({
        sourceImagePath: input,
        privateOutputDirectory: storage,
        derivativeKey: 'opaque-social-demo-12345',
        socialPreviewConsent: 'revoked',
      }),
    ).rejects.toThrow('SOCIAL_PREVIEW_CONSENT_REQUIRED');
    await expect(
      generatePrivateSocialCover({
        sourceImagePath: input,
        privateOutputDirectory: join(process.cwd(), 'apps/play/public'),
        derivativeKey: 'opaque-social-demo-12345',
        socialPreviewConsent: 'granted',
      }),
    ).rejects.toThrow('SOCIAL_PREVIEW_PUBLIC_PATH_REJECTED');
  });

  it('rejects untrusted output keys', async () => {
    const { input, storage } = await createInput();
    await expect(
      generatePrivateSocialCover({
        sourceImagePath: input,
        privateOutputDirectory: storage,
        derivativeKey: '../customer-id',
        socialPreviewConsent: 'granted',
      }),
    ).rejects.toThrow('SOCIAL_PREVIEW_OPAQUE_KEY_REQUIRED');
  });
});
