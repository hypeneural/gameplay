import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { filterSourceDirectory } from '../src/sourceFilter.js';
import { prepareMultiLocalMedia } from '../src/prepareMultiLocal.js';
import { mediaRecipeKey } from '../src/recipe.js';
import { toLongPath } from '../src/index.js';

describe('multi-client media pipeline and source filter', () => {
  it('filters prefixes, ignores subdirectories and rejects non-image formats strictly', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-test-filter-'));
    const sourceDir = join(root, 'input');
    await mkdir(sourceDir);

    // 1. Eligible photos
    await sharp({ create: { width: 400, height: 400, channels: 3, background: '#123456' } })
      .jpeg()
      .toFile(join(sourceDir, 'photo_01.jpg'));
    await sharp({ create: { width: 500, height: 600, channels: 3, background: '#654321' } })
      .png()
      .toFile(join(sourceDir, 'photo_02.png'));

    // 2. Photos containing words in the MIDDLE (MUST BE PRESERVED)
    await sharp({ create: { width: 400, height: 400, channels: 3, background: '#abcdef' } })
      .jpeg()
      .toFile(join(sourceDir, 'minha_foto_globo_natal.jpg'));
    await sharp({ create: { width: 400, height: 400, channels: 3, background: '#fedcba' } })
      .jpeg()
      .toFile(join(sourceDir, 'ensaio_calendario_2026.jpg'));

    // 3. Ignored by prefix (case-insensitive, with and without accents, leading spaces)
    await sharp({ create: { width: 400, height: 400, channels: 3, background: '#000000' } })
      .jpeg()
      .toFile(join(sourceDir, 'Calendario_0M4A2074.jpg'));
    await sharp({ create: { width: 400, height: 400, channels: 3, background: '#000000' } })
      .jpeg()
      .toFile(join(sourceDir, '  calendário_teste.jpg'));
    await sharp({ create: { width: 400, height: 400, channels: 3, background: '#000000' } })
      .jpeg()
      .toFile(join(sourceDir, 'Globo_0M4A2074.jpg'));
    await sharp({ create: { width: 400, height: 400, channels: 3, background: '#000000' } })
      .jpeg()
      .toFile(join(sourceDir, 'globo_natalino.png'));

    // 4. Incompatible format (e.g. zip, txt)
    await writeFile(join(sourceDir, '0M4A0909.zip'), 'PK fake zip content');
    await writeFile(join(sourceDir, 'notes.txt'), 'text notes');

    // 5. Subdirectory with content (MUST BE IGNORED)
    const subDir = join(sourceDir, 'BAIXA');
    await mkdir(subDir);
    await sharp({ create: { width: 100, height: 100, channels: 3, background: '#999999' } })
      .jpeg()
      .toFile(join(subDir, 'sub_photo.jpg'));

    const result = await filterSourceDirectory(sourceDir);

    expect(result.counts).toEqual({
      totalEntries: 11,
      eligible: 4,
      ignoredByPrefix: 4,
      ignoredSubdirectories: 1,
      incompatibleFormat: 2,
    });

    const eligibleNames = result.eligible.map((f) => f.fileName);
    expect(eligibleNames).toEqual([
      'ensaio_calendario_2026.jpg',
      'minha_foto_globo_natal.jpg',
      'photo_01.jpg',
      'photo_02.png',
    ]);
    expect(result.details.ignoredSubdirectoriesNames).toEqual(['BAIXA']);
    expect([...result.details.incompatibleFiles].sort()).toEqual(
      ['0M4A0909.zip', 'notes.txt'].sort(),
    );
  });

  it('rejects path traversal and malformed client aliases before creating storage', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-test-client-slug-'));
    const configPath = join(root, 'clients.invalid.json');
    for (const alias of ['../escape', '..', 'nested/path', 'UPPER', 'client name']) {
      await writeFile(
        configPath,
        JSON.stringify({
          storageRoot: join(root, 'storage'),
          clients: [{ alias, displayName: 'Teste', sourceDirectory: root }],
        }),
      );
      await expect(prepareMultiLocalMedia({ configPath })).rejects.toThrow(
        'Client alias must be a safe lowercase slug.',
      );
    }
  });

  it('prepares multiple isolated clients and preserves tokens across re-runs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-test-multi-'));
    const dirA = join(root, 'clientA');
    const dirB = join(root, 'clientB');
    const storageRoot = join(root, 'storage');

    await mkdir(dirA);
    await mkdir(dirB);

    await sharp({ create: { width: 600, height: 800, channels: 3, background: '#8f1d35' } })
      .jpeg()
      .toFile(join(dirA, 'foto_familia_a_1.jpg'));
    await sharp({ create: { width: 800, height: 600, channels: 3, background: '#8f1d35' } })
      .jpeg()
      .toFile(join(dirA, 'foto_familia_a_2.jpg'));

    await sharp({ create: { width: 700, height: 700, channels: 3, background: '#103e35' } })
      .jpeg()
      .toFile(join(dirB, 'foto_familia_b_1.jpg'));

    const configPath = join(root, 'clients.test.json');
    await writeFile(
      configPath,
      JSON.stringify({
        storageRoot,
        clients: [
          { alias: 'cliente-a', displayName: 'Família A', sourceDirectory: dirA },
          { alias: 'cliente-b', displayName: 'Família B', sourceDirectory: dirB },
        ],
      }),
    );

    // First preparation
    const firstRun = await prepareMultiLocalMedia({ configPath });
    expect(firstRun.status).toBe('ready');
    expect(firstRun.clients).toHaveLength(2);

    const clientAReport1 = firstRun.clients.find((c) => c.alias === 'cliente-a')!;
    const clientBReport1 = firstRun.clients.find((c) => c.alias === 'cliente-b')!;

    expect(clientAReport1.counts.eligible).toBe(2);
    expect(clientBReport1.counts.eligible).toBe(1);
    expect(clientAReport1.publicToken).not.toBe(clientBReport1.publicToken);
    expect(clientAReport1.sessionId).not.toBe(clientBReport1.sessionId);

    // Read generated configs
    const registry = JSON.parse(
      await readFile(join(storageRoot, 'local-test-registry.json'), 'utf8'),
    ) as { sessions: Array<{ alias: string; publicToken: string; sessionId: string }> };

    expect(registry.sessions).toHaveLength(2);

    // Second run (must preserve tokens and session IDs and hit cache)
    const secondRun = await prepareMultiLocalMedia({ configPath });
    const clientAReport2 = secondRun.clients.find((c) => c.alias === 'cliente-a')!;
    const clientBReport2 = secondRun.clients.find((c) => c.alias === 'cliente-b')!;

    expect(clientAReport2.publicToken).toBe(clientAReport1.publicToken);
    expect(clientAReport2.sessionId).toBe(clientAReport1.sessionId);
    expect(clientBReport2.publicToken).toBe(clientBReport1.publicToken);
    expect(clientBReport2.sessionId).toBe(clientBReport1.sessionId);
    expect(clientAReport2.metrics.cacheHit).toBe(true);
  }, 30000);

  it('converts Rec. 2020 color profile to sRGB and strips metadata from WebP derivatives', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-test-icc-'));
    const sourceDir = join(root, 'icc-input');
    const storageRoot = join(root, 'icc-storage');
    await mkdir(sourceDir);

    const sampleFromEnv = process.env.LOCAL_TEST_ICC_SAMPLE;
    const inputPath = join(sourceDir, 'test_image.jpg');

    if (sampleFromEnv) {
      try {
        const sampleBuffer = await readFile(sampleFromEnv);
        await sharp(sampleBuffer)
          .resize({ width: 800, height: 600, fit: 'inside' })
          .withMetadata()
          .jpeg({ quality: 90 })
          .toFile(inputPath);
      } catch {
        await sharp({ create: { width: 500, height: 500, channels: 3, background: '#aa2233' } })
          .withMetadata({ exif: { IFD0: { Copyright: 'Synthetic Test' } } })
          .jpeg()
          .toFile(inputPath);
      }
    } else {
      await sharp({ create: { width: 500, height: 500, channels: 3, background: '#aa2233' } })
        .withMetadata({ exif: { IFD0: { Copyright: 'Synthetic Test' } } })
        .jpeg()
        .toFile(inputPath);
    }

    const configPath = join(root, 'clients.icc.json');
    await writeFile(
      configPath,
      JSON.stringify({
        storageRoot,
        clients: [{ alias: 'cliente-icc', displayName: 'Cliente ICC', sourceDirectory: sourceDir }],
      }),
    );

    const result = await prepareMultiLocalMedia({ configPath });
    expect(result.status).toBe('ready');

    const clientReport = result.clients[0]!;
    const clientStorage = join(storageRoot, 'clients', 'cliente-icc');
    const sessionConfig = JSON.parse(
      await readFile(join(clientStorage, 'local-test-session.json'), 'utf8'),
    ) as {
      photos: Array<{ id: string; contentHash: string }>;
    };

    const photo = sessionConfig.photos[0]!;
    const derivativePath = join(
      clientStorage,
      'derived',
      clientReport.sessionId,
      photo.id,
      photo.contentHash,
      mediaRecipeKey,
      'card.webp',
    );

    const derivedMeta = await sharp(toLongPath(derivativePath)).metadata();
    expect(derivedMeta.format).toBe('webp');
    expect(derivedMeta.space).toBe('srgb');
    expect(derivedMeta.hasProfile).toBe(false);
    expect(derivedMeta.icc).toBeUndefined();
    expect(derivedMeta.exif).toBeUndefined();
    expect(derivedMeta.xmp).toBeUndefined();
  }, 20_000);
});
