import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { inspectPhotoCorpus } from '../src/inspect.js';

describe('inspectPhotoCorpus', () => {
  it('uses only direct session images and keeps normalized orientation stats', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-games-'));
    const session = join(root, 'session-a');
    const lowResolutionFolder = join(session, 'baixa');
    await mkdir(lowResolutionFolder, { recursive: true });
    await sharp({ create: { width: 500, height: 700, channels: 3, background: '#8f1d35' } })
      .jpeg()
      .toFile(join(session, 'portrait.jpg'));
    await sharp({ create: { width: 700, height: 500, channels: 3, background: '#103e35' } })
      .jpeg()
      .toFile(join(session, 'landscape.jpg'));
    await sharp({ create: { width: 50, height: 50, channels: 3, background: '#000000' } })
      .jpeg()
      .toFile(join(lowResolutionFolder, 'ignore.jpg'));
    await sharp({ create: { width: 500, height: 700, channels: 3, background: '#000000' } })
      .tiff()
      .toFile(join(session, 'unsupported.tiff'));
    await writeFile(join(session, 'corrupt.jpg'), 'not an image');

    const result = await inspectPhotoCorpus(root);

    expect(result.directImages).toBe(3);
    expect(result.sampledImages).toBe(2);
    expect(result.sourceLayout).toBe('session-root');
    expect(result.unsupportedCandidates).toEqual({ '.tiff': 1 });
    expect(result.unreadableCandidates).toBe(1);
    expect(result.orientation).toEqual({ portrait: 1, landscape: 1, square: 0 });
  });

  it('recognizes one explicit date-folder layer without descending into baixa folders', async () => {
    const root = await mkdtemp(join(tmpdir(), 'christmas-games-'));
    const session = join(root, '01 11 2024', 'session-a');
    await mkdir(join(session, 'baixa'), { recursive: true });
    await sharp({ create: { width: 700, height: 500, channels: 3, background: '#103e35' } })
      .jpeg()
      .toFile(join(session, 'landscape.jpg'));
    await sharp({ create: { width: 50, height: 50, channels: 3, background: '#000000' } })
      .jpeg()
      .toFile(join(session, 'baixa', 'ignore.jpg'));

    const result = await inspectPhotoCorpus(root);

    expect(result.sourceLayout).toBe('day-batches');
    expect(result.sessionDirectories).toBe(1);
    expect(result.sessions).toBe(1);
    expect(result.directImages).toBe(1);
  });
});
