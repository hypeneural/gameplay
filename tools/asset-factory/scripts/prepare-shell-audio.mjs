import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { spawnSync } from 'node:child_process';

// Explicit offline preparation; never part of a browser build or an audit.
const sourceRoot = process.argv[2];
if (!sourceRoot) throw new Error('Provide the local Sonoros directory.');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const owner = 'christmas-shell';
const publicDirectory = `apps/play/public/assets/${owner}/audio`;
const manifestDirectory = `apps/play/assets/${owner}`;
const work = await mkdtemp(join(tmpdir(), 'christmas-shell-audio-'));
const recipes = [
  { id: 'tap', input: 'Audio/click_001.ogg', seconds: 0.18, volume: 0.26 },
  { id: 'toggle', input: 'Audio/switch_002.ogg', seconds: 0.24, volume: 0.25 },
  { id: 'magic', input: 'Audio/glass_002.ogg', seconds: 0.65, volume: 0.2, notes: [1.25, 1.5] },
  { id: 'paper-a', input: 'Audio2/card-slide-1.ogg', seconds: 0.48, volume: 0.28 },
  { id: 'paper-b', input: 'Audio2/card-slide-2.ogg', seconds: 0.48, volume: 0.28 },
  { id: 'open', input: 'Audio2/cards-pack-take-out-2.ogg', seconds: 0.64, volume: 0.26 },
  { id: 'back', input: 'Audio/close_001.ogg', seconds: 0.22, volume: 0.26 },
  {
    id: 'reveal',
    input: 'Audio/glass_001.ogg',
    seconds: 0.95,
    volume: 0.22,
    notes: [1, 1.25, 1.5],
  },
  {
    id: 'bells-a',
    input: 'Audio/glass_001.ogg',
    seconds: 1.1,
    volume: 0.24,
    bell: 920,
  },
  {
    id: 'bells-b',
    input: 'Audio/glass_001.ogg',
    seconds: 1.1,
    volume: 0.24,
    bell: 980,
  },
  {
    id: 'snow',
    input: 'Audio/glass_001.ogg',
    seconds: 1.2,
    volume: 0.2,
    notes: [1.5, 1.25, 1, 0.84],
  },
  { id: 'start', input: 'Audio/confirmation_004.ogg', seconds: 0.56, volume: 0.24 },
];

function command(binary, arguments_) {
  const result = spawnSync(binary, arguments_, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`${binary}: ${result.stderr || result.error}`);
  return result;
}
async function removeTemporaryDirectory(directory) {
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith('christmas-shell-audio-')
  )
    throw new Error('Refusing to remove an unexpected temporary directory.');
  await rm(directory, { recursive: true, force: true });
}

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
const ffmpegVersion = `ffmpeg:${command('ffmpeg', ['-version'])
  .stdout.split(/\s+/)[2]
  .replace(/[^A-Za-z0-9._-]/g, '-')}`;
const manifest = {
  version: 2,
  gameId: owner,
  budget: { publicBytesMax: 260000, runtimeBytesMax: 150000, visualBytesMax: 0 },
  assets: [],
};
const runtime = {};
const sourceRecords = [];
try {
  await mkdir(resolve(root, publicDirectory), { recursive: true });
  await mkdir(resolve(root, manifestDirectory), { recursive: true });
  for (const recipe of recipes) {
    const input = resolve(sourceRoot, recipe.input);
    const sourceHash = hash(await readFile(input));
    const staged = join(work, `${recipe.id}.wav`);
    const tail = `highpass=f=90,lowpass=f=7000,apad=pad_dur=${recipe.seconds},atrim=end_sample=${Math.round(recipe.seconds * 44100)},asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=${recipe.seconds - 0.12}:d=0.12`;
    let filter;
    if (recipe.bell) {
      const modes = [1, 2.01, 2.72, 3.96, 5.4];
      const tone = modes
        .map(
          (ratio, index) =>
            `${0.5 / (index + 1)}*sin(2*PI*${recipe.bell * ratio}*t)*exp(-t*${3 + index * 1.2})`,
        )
        .join('+');
      filter = `[0:a]aformat=sample_rates=44100:channel_layouts=mono,atrim=end_sample=2205,afade=t=out:st=0.015:d=0.035,volume=0.25[impact];aevalsrc=exprs='(${tone})*min(1,t/0.003)':s=44100:d=${recipe.seconds}[bell];[impact][bell]amix=inputs=2:normalize=0,${tail}[out]`;
    } else if (recipe.notes) {
      const notes = recipe.notes;
      filter =
        `[0:a]aformat=sample_rates=44100:channel_layouts=mono,asplit=${notes.length}${notes.map((_, i) => `[n${i}]`).join('')};` +
        notes
          .map(
            (pitch, i) =>
              `[n${i}]asetrate=${44100 * pitch},aresample=44100,adelay=${i * 130},volume=${0.8 - i * 0.1}[p${i}]`,
          )
          .join(';') +
        ';' +
        `${notes.map((_, i) => `[p${i}]`).join('')}amix=inputs=${notes.length}:normalize=0,aecho=0.8:0.7:45|95:0.18|0.10,${tail}[out]`;
    } else {
      filter = `[0:a]aformat=sample_rates=44100:channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-55dB,${tail}[out]`;
    }
    command('ffmpeg', [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      input,
      '-filter_complex',
      filter,
      '-map',
      '[out]',
      '-t',
      String(recipe.seconds),
      '-fs',
      '524288',
      '-c:a',
      'pcm_s16le',
      staged,
    ]);
    const stagedInfo = JSON.parse(
      command('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration,size',
        '-of',
        'json',
        staged,
      ]).stdout,
    );
    if (
      Number(stagedInfo.format.duration) > recipe.seconds + 0.01 ||
      Number(stagedInfo.format.size) > recipe.seconds * 44100 * 2 + 512
    )
      throw new Error(`Prepared audio exceeds its finite sample budget: ${recipe.id}`);
    const analysis = command('ffmpeg', [
      '-nostdin',
      '-hide_banner',
      '-i',
      staged,
      '-af',
      'volumedetect',
      '-f',
      'null',
      '-',
    ]);
    const peak = Number(/max_volume:\s*(-?[\d.]+) dB/.exec(analysis.stderr)?.[1]);
    if (!Number.isFinite(peak)) throw new Error(`No finite audio peak: ${recipe.id}`);
    runtime[recipe.id] = { mp3: '', m4a: '', volume: recipe.volume };
    for (const format of ['mp3', 'm4a']) {
      const file = `${publicDirectory}/${recipe.id}-v1.${format}`;
      const codec =
        format === 'mp3'
          ? ['-c:a', 'libmp3lame', '-b:a', '80k']
          : ['-c:a', 'aac', '-b:a', '80k', '-movflags', '+faststart'];
      command('ffmpeg', [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        staged,
        '-af',
        `volume=${-6 - peak}dB`,
        '-map_metadata',
        '-1',
        '-ar',
        '44100',
        '-ac',
        '1',
        ...codec,
        resolve(root, file),
      ]);
      const bytes = await readFile(resolve(root, file));
      const probe = JSON.parse(
        command('ffprobe', [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'json',
          resolve(root, file),
        ]).stdout,
      );
      const publicPath = file.replace('apps/play/public', '');
      runtime[recipe.id][format] = publicPath;
      const packUrl = recipe.input.startsWith('Audio2/')
        ? 'https://kenney.nl/assets/casino-audio'
        : 'https://kenney.nl/assets/interface-sounds';
      manifest.assets.push({
        id: `${recipe.id}-${format}`,
        kind: 'audio',
        format,
        source: {
          provider: 'Kenney',
          origin: 'third-party-licensed',
          identifier: recipe.input,
          referenceUrl: packUrl,
          license: 'CC0-1.0',
          licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
          reviewedOn: '2026-09-07',
          reviewedBy: 'Codex-owner-request-2026-09-07',
          record: `ASSET_PROVENANCE.md#${recipe.id}`,
        },
        art: {
          family: 'christmas-photo-first',
          christmasFit: 'approved',
          photoSafety: 'approved',
          mobileLegibility: 'approved',
          state: 'PRONTO_PARA_RUNTIME',
          justification:
            'Resposta curta ao gesto; normalizacao a -6 dBFS, volume reduzido e retorno visual equivalente. Avaliacao auditiva em aparelho permanece no gate de release.',
        },
        processing: { recipe: `prepare-shell-audio.mjs:${recipe.id}`, tools: [ffmpegVersion] },
        runtime: {
          file,
          publicPath,
          bytes: bytes.length,
          sha256: hash(bytes),
          durationSeconds: Number(probe.format.duration),
          cue: recipe.id,
          deliveryGroup: recipe.id,
          quality: { low: 'keep', reducedMotion: 'keep' },
        },
      });
    }
    sourceRecords.push(
      `## ${recipe.id}\n\nFonte: ${recipe.input}. SHA-256 original: \`${sourceHash}\`.\nDuração de desenho: ${recipe.seconds} s. Volume no runtime: ${recipe.volume}.\nFiltro reproduzível: \`${filter}\`. Pico medido antes do ajuste: ${peak} dBFS; alvo de preparação: -6 dBFS.\n`,
    );
  }
  await writeFile(
    resolve(root, manifestDirectory, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  await writeFile(
    resolve(root, 'apps/play/src/audio/shellAudioAssets.ts'),
    `// Generated by the explicit offline shell audio preparation script.\nexport const shellAudioAssets = ${JSON.stringify(runtime, null, 2)} as const;\n`,
  );
  await writeFile(
    resolve(root, manifestDirectory, 'ASSET_PROVENANCE.md'),
    `# Audio do shell natalino\n\nPedido do proprietário de 2026-09-07: usar os packs locais fornecidos para o Hub e suas capas.\n\nKenney Interface Sounds e Casino Audio, CC0-1.0, identificados pelo catálogo local e conferidos nas páginas oficiais em 2026-09-07. O diretório Audio2 contém também variantes legadas de nomes de cartas. Não atribuímos os arquivos ao projeto.\n\nFontes: [Interface Sounds](https://kenney.nl/assets/interface-sounds), [Casino Audio](https://kenney.nl/assets/casino-audio), [CC0](https://creativecommons.org/publicdomain/zero/1.0/).\n\nProcessamento offline: FFmpeg, mono 44.1 kHz, MP3/AAC 80 kbit/s, metadados removidos, bordas suaves. Os sons musicais combinam o vidro CC0 em alturas e tempos diferentes. Sem música ou fala. Originais intactos.\n\nReproduzir com: \`node tools/asset-factory/scripts/prepare-shell-audio.mjs <diretorio-Sonoros>\`. Nunca executar no navegador.\n\nChristmas SFX Pack e 400 Sounds Pack: catálogo local sem licença documentada; nenhum arquivo integrado. Shapeforms: licença própria com proteção contra extração; nenhum arquivo integrado nesta entrega de áudio estático.\n\nA adequação técnica foi inspecionada por duração, pico, formatos e resposta ao gesto. A aprovação auditiva em alto-falante de telefone continua necessária; não se declara escuta humana onde ela não ocorreu.\n\n${sourceRecords.join('\n')}`,
  );
  console.log(
    `Prepared ${manifest.assets.length} files; ${manifest.assets.reduce((sum, asset) => sum + asset.runtime.bytes, 0)} public bytes.`,
  );
} finally {
  // Only the exact newly-created OS temporary directory is removed.
  await removeTemporaryDirectory(work);
}
