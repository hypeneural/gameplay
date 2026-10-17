import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { preparePublicShowcase } from '../src/prepareShowcase.js';

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cg-showcase-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('preparePublicShowcase', () => {
  it('fails closed when consentApproved is false', async () => {
    const root = await createTempDir();
    await expect(
      preparePublicShowcase({
        sourceDirectory: root,
        outputDirectory: join(root, 'out'),
        consentApproved: false,
      }),
    ).rejects.toThrow(/consent-approved/);
  });

  it('processes valid images, excludes product prefixes, strips EXIF, and writes sanitized manifest', async () => {
    const root = await createTempDir();
    const sourceDir = join(root, 'source');
    const outDir = join(root, 'out');
    await mkdir(sourceDir, { recursive: true });
    await mkdir(join(sourceDir, 'subfolder'), { recursive: true });

    const landscapeBuf = await sharp({
      create: {
        width: 1800,
        height: 1200,
        channels: 3,
        background: { r: 180, g: 30, b: 40 },
      },
    })
      .withMetadata({ exif: { IFD0: { Artist: 'Private Name Secret' } } })
      .jpeg()
      .toBuffer();

    const portraitBuf = await sharp({
      create: {
        width: 900,
        height: 1400,
        channels: 3,
        background: { r: 20, g: 120, b: 60 },
      },
    })
      .png()
      .toBuffer();

    const productBuf = await sharp({
      create: {
        width: 600,
        height: 600,
        channels: 3,
        background: { r: 90, g: 90, b: 90 },
      },
    })
      .jpeg()
      .toBuffer();

    await writeFile(join(sourceDir, 'Familia_Silva_01.jpg'), landscapeBuf);
    await writeFile(join(sourceDir, 'Familia_Silva_02.png'), portraitBuf);
    await writeFile(join(sourceDir, 'Calendário 2026.jpg'), productBuf);
    await writeFile(join(sourceDir, 'Globo de Neve.jpg'), productBuf);
    await writeFile(join(sourceDir, 'Chaveiro.png'), productBuf);
    await writeFile(join(sourceDir, 'notes.txt'), 'ignore me');

    const dryResult = await preparePublicShowcase({
      sourceDirectory: sourceDir,
      outputDirectory: outDir,
      consentApproved: true,
      dryRun: true,
    });
    expect(dryResult.dryRun).toBe(true);
    expect(dryResult.eligibleCount).toBe(2);
    expect(dryResult.ignoredProductCount).toBe(3);
    expect(dryResult.ignoredSubdirectoryCount).toBe(1);
    expect(dryResult.incompatibleCount).toBe(1);
    await expect(stat(outDir)).rejects.toThrow();

    const published = await preparePublicShowcase({
      sourceDirectory: sourceDir,
      outputDirectory: outDir,
      consentApproved: true,
    });
    expect(published.dryRun).toBe(false);
    expect(published.eligibleCount).toBe(2);
    expect(published.orientations).toEqual({
      landscape: 1,
      portrait: 1,
      square: 0,
    });

    const manifestRaw = await readFile(join(outDir, 'manifest.json'), 'utf8');
    expect(manifestRaw).not.toContain('Familia_Silva');
    expect(manifestRaw).not.toContain('Private Name Secret');
    expect(manifestRaw).not.toContain(sourceDir);

    const p1 = published.manifest.photos[0]!;
    expect(p1.photoId).toBe('demo_001');
    expect(p1.orientation).toBe('landscape');
    expect(p1.width).toBe(1600);
    expect(p1.height).toBe(1067);
    expect(p1.variants.thumb).toMatch(/^\/showcase\/v1\/demo_001\/thumb\.webp\?v=[a-f0-9]{12}$/);

    const gameBytes = await readFile(join(outDir, 'demo_001', 'game.webp'));
    const gameMeta = await sharp(gameBytes).metadata();
    expect(gameMeta.format).toBe('webp');
    expect(gameMeta.exif).toBeUndefined();
  });

  it('rejects duplicate source images by SHA-256', async () => {
    const root = await createTempDir();
    const sourceDir = join(root, 'source');
    await mkdir(sourceDir, { recursive: true });

    const imgBuf = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 100, g: 50, b: 50 },
      },
    })
      .png()
      .toBuffer();

    await writeFile(join(sourceDir, 'a.png'), imgBuf);
    await writeFile(join(sourceDir, 'b.png'), imgBuf);

    await expect(
      preparePublicShowcase({
        sourceDirectory: sourceDir,
        outputDirectory: join(root, 'out'),
        consentApproved: true,
      }),
    ).rejects.toThrow(/Duplicate source image SHA-256/);
  });
});
