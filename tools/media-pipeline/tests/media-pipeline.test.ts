import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processMediaJob, processMediaJobs, writeManifest } from '../src/index.js';
import { prepareLocalMedia } from '../src/prepareLocal.js';
import { mediaRecipeKey, mediaWorkerFingerprint } from '../src/recipe.js';

describe('processMediaJob', () => {
  it('keeps portrait dimensions proportional and records real derivative metrics', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-games-'));
    const sourcePath = join(root, 'portrait.jpg');
    await sharp({ create: { width: 500, height: 700, channels: 3, background: '#8f1d35' } })
      .jpeg()
      .toFile(sourcePath);

    const result = await processMediaJob({
      sourcePath,
      storageRoot: join(root, 'storage'),
      sessionUuid: '6b70a559-0ca2-43ca-8d54-a97d5aee5f67',
      photoId: 'ph_001',
    });

    expect(result).toMatchObject({
      orientation: 'portrait',
      width: 500,
      height: 700,
      state: 'ready',
      recipeKey: mediaRecipeKey,
    });
    expect(result.derivativeMetrics).toEqual({
      thumb: expect.objectContaining({ width: 343, height: 480, byteLength: expect.any(Number) }),
      card: expect.objectContaining({ width: 500, height: 700, byteLength: expect.any(Number) }),
      game: expect.objectContaining({ width: 500, height: 700, byteLength: expect.any(Number) }),
    });
    const game = await sharp(await readFile(result.derivatives!.game)).metadata();
    expect(game.width).toBe(500);
    expect(game.height).toBe(700);
  });

  it('rejects a non-image source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-games-'));
    const sourcePath = join(root, 'bad.txt');
    await writeFile(sourcePath, 'not an image');
    await expect(
      processMediaJob({
        sourcePath,
        storageRoot: join(root, 'storage'),
        sessionUuid: '6b70a559-0ca2-43ca-8d54-a97d5aee5f67',
        photoId: 'ph_001',
      }),
    ).rejects.toThrow();
  });

  it('is idempotent for the same source and recipe namespace', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-games-'));
    const sourcePath = join(root, 'landscape.jpg');
    await sharp({ create: { width: 700, height: 500, channels: 3, background: '#103e35' } })
      .jpeg()
      .toFile(sourcePath);
    const job = {
      sourcePath,
      storageRoot: join(root, 'storage'),
      sessionUuid: '6b70a559-0ca2-43ca-8d54-a97d5aee5f67',
      photoId: 'ph_002',
    };

    const first = await processMediaJob(job);
    const second = await processMediaJob(job);

    expect(second).toEqual(first);
    expect(second.derivatives!.game).toContain(mediaRecipeKey);
  });

  it('creates a new immutable original namespace when a reused photo id changes pixels', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-games-'));
    const sourcePath = join(root, 'replaceable.jpg');
    const job = {
      sourcePath,
      storageRoot: join(root, 'storage'),
      sessionUuid: '6b70a559-0ca2-43ca-8d54-a97d5aee5f67',
      photoId: 'ph_immutable',
    };
    await sharp({ create: { width: 700, height: 500, channels: 3, background: '#103e35' } })
      .jpeg()
      .toFile(sourcePath);
    const first = await processMediaJob(job);
    await sharp({ create: { width: 500, height: 700, channels: 3, background: '#8f1d35' } })
      .jpeg()
      .toFile(sourcePath);
    const second = await processMediaJob(job);

    expect(second.contentHash).not.toBe(first.contentHash);
    expect(second.derivatives!.game).not.toBe(first.derivatives!.game);
    expect(await readFile(first.derivatives!.game)).not.toEqual(
      await readFile(second.derivatives!.game),
    );
  });

  it('isolates a failed photo from the rest of a bounded batch', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-games-'));
    const sourcePath = join(root, 'portrait.jpg');
    await sharp({ create: { width: 500, height: 700, channels: 3, background: '#8f1d35' } })
      .jpeg()
      .toFile(sourcePath);
    const result = await processMediaJobs(
      [
        {
          sourcePath,
          storageRoot: join(root, 'storage'),
          sessionUuid: '6b70a559-0ca2-43ca-8d54-a97d5aee5f67',
          photoId: 'ph_003',
        },
        {
          sourcePath: join(root, 'missing.jpg'),
          storageRoot: join(root, 'storage'),
          sessionUuid: '6b70a559-0ca2-43ca-8d54-a97d5aee5f67',
          photoId: 'ph_004',
        },
      ],
      2,
    );

    expect(result.ready).toHaveLength(1);
    expect(result.failed).toEqual([
      {
        photoId: 'ph_004',
        state: 'failed',
        recipeKey: mediaRecipeKey,
        error: 'media_processing_failed',
      },
    ]);
  });

  it('upserts a complete versioned manifest through a same-directory rename', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-games-'));
    await writeManifest(root, '6b70a559-0ca2-43ca-8d54-a97d5aee5f67', [
      { photoId: 'ph_005', state: 'ready', recipeKey: mediaRecipeKey },
    ]);
    await writeManifest(root, '6b70a559-0ca2-43ca-8d54-a97d5aee5f67', [
      {
        photoId: 'ph_006',
        state: 'failed',
        recipeKey: mediaRecipeKey,
        error: 'media_processing_failed',
      },
    ]);

    const manifest = JSON.parse(
      await readFile(
        join(root, 'derived', '6b70a559-0ca2-43ca-8d54-a97d5aee5f67', 'manifest.json'),
        'utf8',
      ),
    ) as {
      version: number;
      worker: { recipeKey: string };
      entries: Array<{ photoId: string }>;
    };
    expect(manifest.version).toBe(2);
    expect(manifest.worker.recipeKey).toBe(mediaRecipeKey);
    expect(manifest.entries).toEqual([
      { photoId: 'ph_005', state: 'ready', recipeKey: mediaRecipeKey },
      {
        photoId: 'ph_006',
        state: 'failed',
        recipeKey: mediaRecipeKey,
        error: 'media_processing_failed',
      },
    ]);
  });

  it('creates stable opaque gallery-lab ids and responsive metrics from direct sources only', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-games-'));
    const sourceDirectory = join(root, 'input');
    const storageRoot = join(root, 'private-cache');
    await mkdir(sourceDirectory);
    await sharp({ create: { width: 700, height: 500, channels: 3, background: '#103e35' } })
      .jpeg()
      .toFile(join(sourceDirectory, 'private-source.jpg'));
    await sharp({ create: { width: 500, height: 700, channels: 3, background: '#8f1d35' } })
      .jpeg()
      .toFile(join(sourceDirectory, 'second.jpg'));
    await mkdir(join(sourceDirectory, 'nested'));
    await sharp({ create: { width: 40, height: 40, channels: 3, background: '#000000' } })
      .jpeg()
      .toFile(join(sourceDirectory, 'nested', 'ignore.jpg'));

    const first = await prepareLocalMedia({ sourceDirectory, storageRoot });
    const rawConfig = await readFile(first.configPath, 'utf8');
    const config = JSON.parse(rawConfig) as {
      version: number;
      worker: { recipeKey: string };
      session: { id: string };
      photos: Array<{
        id: string;
        orientation: string;
        width: number;
        height: number;
        variantMetrics: {
          thumb: { width: number; height: number; byteLength: number };
          card: { width: number; height: number; byteLength: number };
          game: { width: number; height: number; byteLength: number };
        };
      }>;
    };

    expect(first).toMatchObject({ ready: 2, failed: 0, recipeKey: mediaRecipeKey });
    expect(config.version).toBe(2);
    expect(config.worker).toEqual(mediaWorkerFingerprint);
    expect(rawConfig).not.toContain('private-source');
    expect(rawConfig).not.toContain('second.jpg');
    expect(config.photos).toHaveLength(2);
    expect(config.photos.every((photo) => /^photo-[a-f0-9]{20}$/.test(photo.id))).toBe(true);
    expect(config.photos.every((photo) => photo.variantMetrics.card.byteLength > 0)).toBe(true);

    const landscapeId = config.photos.find((photo) => photo.orientation === 'landscape')!.id;
    const portraitId = config.photos.find((photo) => photo.orientation === 'portrait')!.id;

    await sharp({ create: { width: 600, height: 600, channels: 3, background: '#d4b15a' } })
      .jpeg()
      .toFile(join(sourceDirectory, 'aaa-added-later.jpg'));
    const second = await prepareLocalMedia({ sourceDirectory, storageRoot });
    const nextConfig = JSON.parse(await readFile(second.configPath, 'utf8')) as typeof config;

    expect(second.ready).toBe(3);
    expect(second.sessionId).toBe(config.session.id);
    expect(nextConfig.photos.find((photo) => photo.orientation === 'landscape')!.id).toBe(
      landscapeId,
    );
    expect(nextConfig.photos.find((photo) => photo.orientation === 'portrait')!.id).toBe(
      portraitId,
    );
  }, 30000);
});
