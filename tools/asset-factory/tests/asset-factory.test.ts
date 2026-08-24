import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseAssetCommand, runAssetCommand } from '../src/index.js';
import { auditAssetManifest, parseAssetManifest } from '../src/manifest.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('asset factory', () => {
  it('accepts only the documented offline commands', () => {
    expect(parseAssetCommand(['audit'])).toEqual({ command: 'audit', gameId: 'puzzle-swap' });
    expect(parseAssetCommand(['catalog', '--game', 'memory-match'])).toEqual({
      command: 'catalog',
      gameId: 'memory-match',
    });
    expect(() => parseAssetCommand(['download'])).toThrow('Choose one command');
    expect(() => parseAssetCommand(['doctor', '--game'])).toThrow('Usage');
  });

  it('rejects paths that could expose files outside the public game assets', () => {
    expect(() =>
      parseAssetManifest({
        ...fixtureManifest,
        assets: [{ ...fixtureManifest.assets[0], file: '../private/photo.webp' }],
      }),
    ).toThrow('public asset directory');
  });

  it('audits declared files, static bundle budget and untracked assets', async () => {
    const root = await fixtureRoot();
    await writeFile(
      join(root, 'apps/play/public/assets/test-game/backgrounds/snow.webp'),
      '1234',
      'utf8',
    );
    const audit = await auditAssetManifest(root, 'test-game');

    expect(audit.errors).toEqual([]);
    expect(audit.totals).toEqual({ publicBytes: 4, runtimeBytes: 4, visualBytes: 4 });

    await writeFile(
      join(root, 'apps/play/public/assets/test-game/untracked.svg'),
      '<svg />',
      'utf8',
    );
    const afterUntracked = await auditAssetManifest(root, 'test-game');
    expect(afterUntracked.untrackedFiles).toEqual([
      'apps/play/public/assets/test-game/untracked.svg',
    ]);
    expect(afterUntracked.errors).toContain(
      'untracked public asset: apps/play/public/assets/test-game/untracked.svg',
    );
  });

  it('reports a concise validation result for automation', async () => {
    const root = await fixtureRoot();
    await writeFile(
      join(root, 'apps/play/public/assets/test-game/backgrounds/snow.webp'),
      '1234',
      'utf8',
    );
    const result = await runAssetCommand({ command: 'validate', gameId: 'test-game' }, root);
    expect(result.exitCode).toBe(0);
    expect(result.lines[0]).toContain('Manifesto válido');
  });
});

const fixtureManifest = {
  version: 1,
  gameId: 'test-game',
  budget: { publicBytesMax: 8, runtimeBytesMax: 8, visualBytesMax: 8 },
  assets: [
    {
      id: 'winter-background',
      kind: 'background',
      format: 'webp',
      file: 'apps/play/public/assets/test-game/backgrounds/snow.webp',
      publicPath: '/assets/test-game/backgrounds/snow.webp',
      bytes: 4,
      dimensions: { width: 1, height: 1 },
      textureKey: 'test-background',
      quality: { low: 'keep', reducedMotion: 'keep' },
      provenance: {
        source: 'project-created',
        license: 'project-owned',
        record: 'ASSET_PROVENANCE.md#visual',
      },
    },
  ],
} as const;

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'christmas-assets-'));
  temporaryRoots.push(root);
  const manifestPath = join(root, 'packages/games/test-game/assets');
  const publicPath = join(root, 'apps/play/public/assets/test-game/backgrounds');
  await Promise.all([
    mkdir(manifestPath, { recursive: true }),
    mkdir(publicPath, { recursive: true }),
  ]);
  await writeFile(
    join(manifestPath, 'manifest.json'),
    `${JSON.stringify(fixtureManifest, null, 2)}\n`,
    'utf8',
  );
  return root;
}
