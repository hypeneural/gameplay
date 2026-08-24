import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processMediaJob, processMediaJobs, writeManifest } from '../src/index.js';
import { prepareLocalMedia } from '../src/prepareLocal.js';

describe('processMediaJob', () => {
  it('keeps portrait dimensions proportional across local derivatives', async () => {
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

  it('is idempotent for the same content-addressed source', async () => {
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
      { photoId: 'ph_004', state: 'failed', error: 'media_processing_failed' },
    ]);
  });

  it('upserts a complete manifest through a same-directory rename', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-games-'));
    await writeManifest(root, '6b70a559-0ca2-43ca-8d54-a97d5aee5f67', [
      { photoId: 'ph_005', state: 'ready' },
    ]);
    await writeManifest(root, '6b70a559-0ca2-43ca-8d54-a97d5aee5f67', [
      { photoId: 'ph_006', state: 'failed', error: 'media_processing_failed' },
    ]);

    const manifest = JSON.parse(
      await readFile(
        join(root, 'derived', '6b70a559-0ca2-43ca-8d54-a97d5aee5f67', 'manifest.json'),
        'utf8',
      ),
    ) as { version: number; entries: Array<{ photoId: string }> };
    expect(manifest.version).toBe(1);
    expect(manifest.entries).toEqual([
      { photoId: 'ph_005', state: 'ready' },
      { photoId: 'ph_006', state: 'failed', error: 'media_processing_failed' },
    ]);
  });

  it('creates opaque local test metadata from direct source photos only', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-games-'));
    const sourceDirectory = join(root, 'input');
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

    const result = await prepareLocalMedia({
      sourceDirectory,
      storageRoot: join(root, 'private-cache'),
    });
    const rawConfig = await readFile(result.configPath, 'utf8');
    const config = JSON.parse(rawConfig) as {
      photos: Array<{ id: string; orientation: string; width: number; height: number }>;
    };

    expect(result).toMatchObject({ ready: 2, failed: 0 });
    expect(rawConfig).not.toContain('private-source');
    expect(config.photos).toEqual([
      expect.objectContaining({
        id: 'photo-001',
        orientation: 'landscape',
        width: 700,
        height: 500,
      }),
      expect.objectContaining({
        id: 'photo-002',
        orientation: 'portrait',
        width: 500,
        height: 700,
      }),
    ]);
  });
});
