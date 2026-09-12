import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(resolve(root, 'tools/media-pipeline/package.json'));
const sharp = require('sharp');
const sourcePath = resolve(root, 'assets-src/rena-das-lembrancas/rig-model-v1.png');
const source = await readFile(sourcePath);
const metadata = await sharp(source).metadata();
if (metadata.width !== 1536 || metadata.height !== 1024 || !metadata.hasAlpha)
  throw new Error('Expected reviewed transparent 1536x1024 rig sheet.');
const manifestPath = resolve(root, 'packages/games/rena-das-lembrancas/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [name, column, row, width] of [
  ['body', 0, 0, 320],
  ['head', 1, 0, 320],
  ['front-leg', 2, 0, 128],
  ['back-leg', 0, 1, 128],
]) {
  const id = `rudolph-${name}-v1`;
  const cell = await sharp(source)
    .extract({ left: column * 512, top: row * 512, width: 512, height: 512 })
    .toBuffer();
  const result = await sharp(cell)
    .trim({ threshold: 12 })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 100, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  const file = `apps/play/public/assets/rena-das-lembrancas/art/${id}.webp`;
  await mkdir(resolve(root, 'apps/play/public/assets/rena-das-lembrancas/art'), {
    recursive: true,
  });
  await writeFile(resolve(root, file), result.data);
  manifest.assets = manifest.assets.filter((asset) => asset.id !== id);
  manifest.assets.push({
    id,
    kind: 'ui',
    format: 'webp',
    source: {
      provider: 'OpenAI built-in image_gen',
      origin: 'project-created',
      identifier: `rig-model-v1-${createHash('sha256').update(source).digest('hex')}`,
      license: 'project-owned',
      reviewedOn: '2026-09-08',
      reviewedBy: 'Codex-rudolph-rig-source-and-alpha-review',
      record: 'ASSET_PROVENANCE.md#rudolph-rig-v1',
    },
    art: {
      family: 'rudolph-plush-diorama-v1',
      christmasFit: 'approved',
      photoSafety: 'approved',
      mobileLegibility: 'approved',
      state: 'PRONTO_PARA_RUNTIME',
      justification:
        'Peca do mesmo modelo de rena natalina, silhueta limpa, alpha conferido, sem fotos ou dados de sessao. Articulacao e composicao revisadas no canvas separadamente.',
    },
    processing: {
      recipe: `prepare-rudolph-art:cell-${column}-${row}:trim12:width${width}:webp86`,
      tools: [`sharp-${sharp.versions.sharp}`, 'image_gen-built-in-model-not-exposed'],
    },
    runtime: {
      file,
      publicPath: `/${file.replace('apps/play/public/', '')}`,
      bytes: result.data.length,
      sha256: createHash('sha256').update(result.data).digest('hex'),
      dimensions: { width: result.info.width, height: result.info.height },
      textureKey: id,
      quality: { low: 'keep', reducedMotion: 'keep' },
    },
  });
  process.stdout.write(
    `${id}: ${result.info.width}x${result.info.height}, ${result.data.length} bytes\n`,
  );
}
for (const [id, width, kind] of [
  ['winter-world-v1', 800, 'background'],
  ['winter-landscape-v1', 1000, 'background'],
  ['frame-material-v3', 640, 'ui'],
  ['santa-sleigh-v1', 360, 'ui'],
]) {
  const raw = await readFile(resolve(root, `assets-src/rena-das-lembrancas/${id}.png`));
  const meta = await sharp(raw).metadata();
  if (id === 'santa-sleigh-v1' && !meta.hasAlpha)
    throw new Error('Santa requires reviewed transparent alpha.');
  const prepared = id === 'santa-sleigh-v1' ? sharp(raw).trim({ threshold: 12 }) : sharp(raw);
  const result = await prepared
    .resize({ width })
    .webp({ quality: 83, alphaQuality: 100, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  const file = `apps/play/public/assets/rena-das-lembrancas/art/${id}.webp`;
  await writeFile(resolve(root, file), result.data);
  manifest.assets = manifest.assets.filter((asset) => asset.id !== id);
  manifest.assets.push({
    id,
    kind,
    format: 'webp',
    source: {
      provider: 'OpenAI built-in image_gen',
      origin: 'project-created',
      identifier: `${id}-${createHash('sha256').update(raw).digest('hex')}`,
      license: 'project-owned',
      reviewedOn: '2026-09-08',
      reviewedBy: 'Codex-rudolph-environment-review',
      record:
        id === 'frame-material-v3'
          ? 'ASSET_PROVENANCE.md#frame-material-v3'
          : 'ASSET_PROVENANCE.md#winter-world-and-santa-v1',
    },
    art: {
      family: 'rudolph-plush-diorama-v1',
      christmasFit: 'approved',
      photoSafety: 'approved',
      mobileLegibility: 'approved',
      state: 'PRONTO_PARA_RUNTIME',
      justification:
        kind === 'background'
          ? 'Vila nos limites inferiores; centro livre para as fotografias.'
          : id === 'frame-material-v3'
            ? 'Madeira e latao em borda compacta de nove regioes. Fotografia inteira acima do centro opaco; cantos preservados ao redimensionar.'
            : 'Treno secundario em uma passagem finita; nunca sobre uma foto em destaque.',
    },
    processing: {
      recipe: `prepare-rudolph-art:${id}:width${width}:webp83`,
      tools: [`sharp-${sharp.versions.sharp}`, 'image_gen-built-in-model-not-exposed'],
    },
    runtime: {
      file,
      publicPath: `/${file.replace('apps/play/public/', '')}`,
      bytes: result.data.length,
      sha256: createHash('sha256').update(result.data).digest('hex'),
      dimensions: { width: result.info.width, height: result.info.height },
      textureKey: `rudolph-${id}`,
      quality: { low: 'keep', reducedMotion: 'keep' },
    },
  });
  process.stdout.write(
    `${id}: ${result.info.width}x${result.info.height}, ${result.data.length} bytes\n`,
  );
}
manifest.budget = { publicBytesMax: 1000000, runtimeBytesMax: 700000, visualBytesMax: 420000 };
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
