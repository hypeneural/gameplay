import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  buildGenericSocialPreview,
  genericSocialSvgSource,
  genericSocialWebpOutput,
  genericSocialJpegOutput,
} from './renderPublicSocialArt.js';

describe('generic Open Graph asset', () => {
  it('ships actual raster 1200x630 WebP and keeps SVG only as editable source', async () => {
    const source = await readFile(genericSocialSvgSource, 'utf8');
    expect(source).toContain('viewBox="0 0 1200 630"');
    const binary = await readFile(genericSocialWebpOutput);
    const metadata = await sharp(binary).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
    expect(binary.byteLength).toBeGreaterThan(8_000);
    expect(binary.byteLength).toBeLessThan(300 * 1024);
    const jpeg = await readFile(genericSocialJpegOutput);
    const jpegMeta = await sharp(jpeg).metadata();
    expect(jpegMeta.format).toBe('jpeg');
    expect(jpegMeta.width).toBe(1200);
    expect(jpegMeta.height).toBe(630);
    expect(jpeg.byteLength).toBeLessThan(300 * 1024);
  });

  it('can render source again without any customer-photo input', async () => {
    const temp = await mkdtemp(join(tmpdir(), 'generic-social-art-'));
    try {
      const result = await buildGenericSocialPreview(
        genericSocialSvgSource,
        join(temp, 'social.webp'),
      );
      expect(result.width).toBe(1200);
      expect(result.height).toBe(630);
      expect(result.bytes).toBeLessThan(300 * 1024);
      expect(result.jpegBytes).toBeLessThan(300 * 1024);
      expect(result.jpegSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
