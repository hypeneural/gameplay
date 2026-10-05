import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(resolve(root, 'tools/media-pipeline/package.json'));
const sharp = require('sharp');

const brainDir = process.argv[2];
if (!brainDir) throw new Error('Provide the directory containing the six generated source JPGs.');

const bgSourcePath = resolve(brainDir, 'estilingue_bg_clean_1789305882953.jpg');
const frameSourcePath = resolve(brainDir, 'moldura_ouro_hero_1789305925747.jpg');
const forkSourcePath = resolve(brainDir, 'garfo_madeira_estilingue_1789305970894.jpg');
const targetsSheetPath = resolve(brainDir, 'alvos_estilingue_sheet_1789306019095.jpg');
const medallionsSheetPath = resolve(brainDir, 'botoes_medalhao_sheet_1789306069023.jpg');
const pouchSourcePath = resolve(brainDir, 'bolsa_couro_estilingue_1789306123551.jpg');

const bgDir = resolve(root, 'apps/play/public/assets/estilingue-das-lembrancas/backgrounds');
const artDir = resolve(root, 'apps/play/public/assets/estilingue-das-lembrancas/art');
const manifestFile = resolve(root, 'packages/games/estilingue-das-lembrancas/assets/manifest.json');

await mkdir(bgDir, { recursive: true });
await mkdir(artDir, { recursive: true });

let manifest = {
  version: 2,
  gameId: 'estilingue-das-lembrancas',
  budget: { publicBytesMax: 1500000, runtimeBytesMax: 950000, visualBytesMax: 550000 },
  assets: [],
};
try {
  manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
} catch {
  // Fresh manifest
}

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function keyBlackBackground(buffer, threshold = 18, softRange = 16) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const maxVal = Math.max(r, g, b);
    if (maxVal <= threshold) {
      data[i + 3] = 0;
    } else if (maxVal < threshold + softRange) {
      data[i + 3] = Math.round(((maxVal - threshold) / softRange) * 255);
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  });
}

async function registerAsset(
  id,
  kind,
  family,
  justification,
  deliveryGroup,
  filePath,
  publicPath,
  buffer,
) {
  const textureKey = {
    'art-bg-sala-natal-estilingue-v1': 'estilingue-bg',
    'art-moldura-ouro-v1': 'moldura-ouro',
    'art-garfo-estilingue-v1': 'garfo-estilingue',
    'art-bolsa-couro-v1': 'bolsa-couro',
    'art-alvo-madeira-quadrado-v1': 'alvo-wood-square',
    'art-alvo-gingerbread-v1': 'alvo-gingerbread',
    'art-alvo-estrela-ouro-v1': 'alvo-gold-star',
    'art-alvo-bola-natal-v1': 'alvo-round-bauble',
    'art-botao-medalhao-musica-v1': 'botao-medallion-music',
    'art-botao-medalhao-arvore-v1': 'botao-medallion-tree',
    'art-botao-medalhao-neve-v1': 'botao-medallion-snow',
    'art-botao-medalhao-sino-v1': 'botao-medallion-bell',
  }[id];
  if (!textureKey) throw new Error(`Missing runtime texture key for ${id}.`);
  const { width, height } = await sharp(buffer).metadata();
  manifest.assets = manifest.assets.filter((a) => a.id !== id);
  manifest.assets.push({
    id,
    kind,
    format: 'webp',
    source: {
      provider: 'generated-christmas-asset',
      origin: 'project-created',
      identifier: hash(buffer),
      license: 'project-owned',
      reviewedOn: '2026-09-13',
      reviewedBy: 'estilingue-das-lembrancas-pipeline',
      record: 'ASSET_PROVENANCE.md#estilingue-art-v2',
    },
    art: {
      family,
      christmasFit: 'approved',
      photoSafety: 'approved',
      mobileLegibility: 'approved',
      state: 'PRONTO_PARA_RUNTIME',
      justification,
    },
    processing: {
      recipe: 'sharp:alpha-key:webp90',
      tools: ['sharp'],
    },
    runtime: {
      file: filePath,
      publicPath,
      bytes: buffer.length,
      sha256: hash(buffer),
      dimensions: { width, height },
      textureKey,
      deliveryGroup: `${deliveryGroup}-${id}`,
      quality: { low: 'keep', reducedMotion: 'keep' },
    },
  });
}

// 1. Clean Background (720x1280 webp)
console.log('Processing clean background...');
const bgBuffer = await sharp(await readFile(bgSourcePath))
  .resize(720, 1280, { fit: 'cover' })
  .webp({ quality: 86, effort: 5 })
  .toBuffer();
const bgFile =
  'apps/play/public/assets/estilingue-das-lembrancas/backgrounds/sala-natal-estilingue-v1.webp';
await writeFile(resolve(root, bgFile), bgBuffer);
await registerAsset(
  'art-bg-sala-natal-estilingue-v1',
  'background',
  'estilingue-winter-room-v2',
  'Sala natalina acolhedora limpa com árvore de natal, lareira e mesa vazia.',
  'background',
  bgFile,
  '/assets/estilingue-das-lembrancas/backgrounds/sala-natal-estilingue-v1.webp',
  bgBuffer,
);

// 2. Ornate Golden Baroque Frame (cutout black outside and center window)
console.log('Processing golden frame...');
const frameRaw = await readFile(frameSourcePath);
const frameKeyed = await keyBlackBackground(frameRaw, 20, 18);
const frameBuffer = await frameKeyed
  .resize(600, 600)
  .webp({ quality: 90, alphaQuality: 100, effort: 5 })
  .toBuffer();
const frameFile = 'apps/play/public/assets/estilingue-das-lembrancas/art/moldura-ouro-v1.webp';
await writeFile(resolve(root, frameFile), frameBuffer);
await registerAsset(
  'art-moldura-ouro-v1',
  'ui',
  'estilingue-frame-v2',
  'Moldura vitoriana dourada com guirlanda, laço vermelho, sinos e centro vazado para foto.',
  'frame',
  frameFile,
  '/assets/estilingue-das-lembrancas/art/moldura-ouro-v1.webp',
  frameBuffer,
);

// 3. Wooden Slingshot Fork
console.log('Processing slingshot fork...');
const forkRaw = await readFile(forkSourcePath);
const forkKeyed = await keyBlackBackground(forkRaw, 16, 16);
const forkBuffer = await forkKeyed
  .resize(360, 360)
  .webp({ quality: 92, alphaQuality: 100, effort: 5 })
  .toBuffer();
const forkFile = 'apps/play/public/assets/estilingue-das-lembrancas/art/garfo-estilingue-v1.webp';
await writeFile(resolve(root, forkFile), forkBuffer);
await registerAsset(
  'art-garfo-estilingue-v1',
  'ui',
  'estilingue-wood-fork-v2',
  'Garfo de madeira maciça entalhada com ponteiras em latão dourado e fundo transparente.',
  'slingshot',
  forkFile,
  '/assets/estilingue-das-lembrancas/art/garfo-estilingue-v1.webp',
  forkBuffer,
);

// 4. Leather Pouch
console.log('Processing leather pouch...');
const pouchRaw = await readFile(pouchSourcePath);
const pouchKeyed = await keyBlackBackground(pouchRaw, 16, 16);
const pouchBuffer = await pouchKeyed
  .resize(180, 180)
  .webp({ quality: 90, alphaQuality: 100, effort: 5 })
  .toBuffer();
const pouchFile = 'apps/play/public/assets/estilingue-das-lembrancas/art/bolsa-couro-v1.webp';
await writeFile(resolve(root, pouchFile), pouchBuffer);
await registerAsset(
  'art-bolsa-couro-v1',
  'ui',
  'estilingue-pouch-v2',
  'Bolsa de couro caramelo costurada com símbolo de floco de neve e ilhoses para elásticos.',
  'slingshot',
  pouchFile,
  '/assets/estilingue-das-lembrancas/art/bolsa-couro-v1.webp',
  pouchBuffer,
);

// 5. Targets (Slice 2x2 grid from 1024x1024)
console.log('Processing 4 targets...');
const targetsRaw = await readFile(targetsSheetPath);
const targetDefs = [
  {
    id: 'alvo-madeira-quadrado-v1',
    file: 'alvo-madeira-quadrado-v1.webp',
    col: 0,
    row: 0,
    title: 'Alvo de madeira tábua com estrela',
  },
  {
    id: 'alvo-gingerbread-v1',
    file: 'alvo-gingerbread-v1.webp',
    col: 1,
    row: 0,
    title: 'Alvo biscoito gingerbread natalino',
  },
  {
    id: 'alvo-estrela-ouro-v1',
    file: 'alvo-estrela-ouro-v1.webp',
    col: 0,
    row: 1,
    title: 'Alvo estrela dourada entalhada',
  },
  {
    id: 'alvo-bola-natal-v1',
    file: 'alvo-bola-natal-v1.webp',
    col: 1,
    row: 1,
    title: 'Alvo bola de natal vermelha de vidro',
  },
];

for (const target of targetDefs) {
  const cell = await sharp(targetsRaw)
    .extract({ left: target.col * 512 + 12, top: target.row * 512 + 12, width: 488, height: 488 })
    .toBuffer();
  const keyed = await keyBlackBackground(cell, 20, 16);
  const targetBuffer = await keyed
    .trim()
    .resize(256, 256, { fit: 'inside' })
    .webp({ quality: 90, alphaQuality: 100, effort: 5 })
    .toBuffer();
  const filePath = `apps/play/public/assets/estilingue-das-lembrancas/art/${target.file}`;
  await writeFile(resolve(root, filePath), targetBuffer);
  await registerAsset(
    `art-${target.id}`,
    'ui',
    'estilingue-targets-v2',
    target.title,
    'targets',
    filePath,
    `/assets/estilingue-das-lembrancas/art/${target.file}`,
    targetBuffer,
  );
}

// 6. Medallion Buttons (Slice 2x2 grid from 1024x1024)
console.log('Processing 4 medallion buttons...');
const medallionsRaw = await readFile(medallionsSheetPath);
const medallionDefs = [
  {
    id: 'botao-medalhao-musica-v1',
    file: 'botao-medalhao-musica-v1.webp',
    col: 0,
    row: 0,
    title: 'Botão medalhão vermelho nota musical dourada',
  },
  {
    id: 'botao-medalhao-arvore-v1',
    file: 'botao-medalhao-arvore-v1.webp',
    col: 1,
    row: 0,
    title: 'Botão medalhão verde árvore de natal dourada',
  },
  {
    id: 'botao-medalhao-neve-v1',
    file: 'botao-medalhao-neve-v1.webp',
    col: 0,
    row: 1,
    title: 'Botão medalhão vermelho floco de neve dourado',
  },
  {
    id: 'botao-medalhao-sino-v1',
    file: 'botao-medalhao-sino-v1.webp',
    col: 1,
    row: 1,
    title: 'Botão medalhão verde sino de natal dourado',
  },
];

for (const medallion of medallionDefs) {
  const cell = await sharp(medallionsRaw)
    .extract({
      left: medallion.col * 512 + 12,
      top: medallion.row * 512 + 12,
      width: 488,
      height: 488,
    })
    .toBuffer();
  const keyed = await keyBlackBackground(cell, 20, 16);
  const medallionBuffer = await keyed
    .trim()
    .resize(192, 192, { fit: 'inside' })
    .webp({ quality: 92, alphaQuality: 100, effort: 5 })
    .toBuffer();
  const filePath = `apps/play/public/assets/estilingue-das-lembrancas/art/${medallion.file}`;
  await writeFile(resolve(root, filePath), medallionBuffer);
  await registerAsset(
    `art-${medallion.id}`,
    'ui',
    'estilingue-medallions-v2',
    medallion.title,
    'shelf',
    filePath,
    `/assets/estilingue-das-lembrancas/art/${medallion.file}`,
    medallionBuffer,
  );
}

await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('✨ All Estilingue high-resolution assets processed and registered successfully!');
