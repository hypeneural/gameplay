import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, URL } from 'node:url';

// Reuse only already catalogued audio. Copies establish independent game ownership.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const gameId = 'magic-photo';
const target = `apps/play/public/assets/${gameId}/audio`;
await mkdir(join(root, target), { recursive: true });
await mkdir(join(root, `packages/games/${gameId}/assets`), { recursive: true });
const shell = JSON.parse(
  await readFile(join(root, 'apps/play/assets/christmas-shell/manifest.json'), 'utf8'),
);
const memory = JSON.parse(
  await readFile(join(root, 'packages/games/memory/assets/manifest.json'), 'utf8'),
);
const mapping = {
  tap: 'tap',
  paper: 'paper-a',
  open: 'open',
  magic: 'magic',
  bells: 'bells-a',
  snow: 'snow',
  reveal: 'reveal',
};
const manifestFile = join(root, `packages/games/${gameId}/assets/manifest.json`);
const previous = JSON.parse(await readFile(manifestFile, 'utf8'));
const assets = previous.assets.filter((asset) => asset.kind !== 'audio');
for (const [cue, sourceCue] of [...Object.entries(mapping), ['music', 'music']]) {
  const sourceManifest = cue === 'music' ? memory : shell;
  const sources = sourceManifest.assets.filter(
    (asset) => asset.kind === 'audio' && asset.runtime.cue === sourceCue,
  );
  if (!sources.length) throw new Error(`Missing catalogued source: ${sourceCue}`);
  for (const source of sources) {
    const file = `${target}/${cue}.${source.format}`;
    await copyFile(join(root, source.runtime.file), join(root, file));
    const bytes = await readFile(join(root, file));
    assets.push({
      ...source,
      id: `${cue}-${source.format}`,
      source: { ...source.source, record: `ASSET_PROVENANCE.md#${cue}` },
      processing: {
        recipe: 'prepare-magic-photo-audio:lossless-copy-of-approved-derivative',
        tools: ['node-24'],
      },
      runtime: {
        ...source.runtime,
        file,
        publicPath: `/assets/${gameId}/audio/${cue}.${source.format}`,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        cue,
        deliveryGroup: cue,
        quality: { low: cue === 'music' ? 'omit' : 'keep', reducedMotion: 'keep' },
      },
    });
  }
}
await writeFile(
  join(root, `packages/games/${gameId}/assets/manifest.json`),
  JSON.stringify(
    {
      version: 2,
      gameId,
      budget: previous.budget,
      assets,
    },
    null,
    2,
  ) + '\n',
);
process.stdout.write(`Prepared ${assets.length} catalogued audio derivatives.\n`);
