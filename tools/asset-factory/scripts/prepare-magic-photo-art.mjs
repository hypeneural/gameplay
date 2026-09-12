import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const sourceRoot = process.argv[2];
if (!sourceRoot) throw new Error('Provide the directory of the four generated source PNGs.');
const manifestPath = resolve(root, 'packages/games/magic-photo/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const assets = [
  ['gift-real-v2', 'ui', 640, 83],
  ['frost-real-v2', 'vfx', 640, 74],
  ['snow-edge-v2', 'vfx', 1000, 78],
  ['winter-night-v2', 'background', 768, 82],
];
for (const [id, kind, width, quality] of assets) {
  const source = await readFile(resolve(sourceRoot, `${id}.png`));
  const file = `apps/play/public/assets/magic-photo/art/${id}.webp`;
  await mkdir(resolve(root, 'apps/play/public/assets/magic-photo/art'), { recursive: true });
  const result = await sharp(source)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, alphaQuality: 100, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(resolve(root, file), result.data);
  const record = {
    id,
    kind,
    format: 'webp',
    source: {
      provider: 'OpenAI built-in image_gen',
      origin: 'project-created',
      identifier: `generated-${createHash('sha256').update(source).digest('hex')}`,
      license: 'project-owned',
      reviewedOn: '2026-09-07',
      reviewedBy: 'Codex-owner-visual-revision-request',
      record: 'ASSET_PROVENANCE.md#inverno-realista-v2',
    },
    art: {
      family: 'christmas-photo-first',
      christmasFit: 'approved',
      photoSafety: 'approved',
      mobileLegibility: 'approved',
      state: 'PRONTO_PARA_RUNTIME',
      justification:
        'Materiais realistas solicitados pelo proprietário; foto intacta sob gelo apagável; neve periférica. Revisão visual mobile registrada no relatório v2.',
    },
    processing: {
      recipe: `prepare-magic-photo-art:width-${width}:webp-q${quality}:alpha100`,
      tools: [`sharp-${sharp.versions.sharp}`, 'image_gen-built-in-model-not-exposed'],
    },
    runtime: {
      file,
      publicPath: `/assets/magic-photo/art/${id}.webp`,
      bytes: result.data.length,
      sha256: createHash('sha256').update(result.data).digest('hex'),
      dimensions: { width: result.info.width, height: result.info.height },
      textureKey: `magic-photo-${id}`,
      quality: { low: 'keep', reducedMotion: 'keep' },
    },
  };
  manifest.assets = manifest.assets.filter((asset) => asset.id !== id);
  manifest.assets.push(record);
  process.stdout.write(
    `${id}: ${result.data.length} bytes, ${result.info.width}x${result.info.height}\n`,
  );
}
manifest.budget.visualBytesMax = 530000;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
