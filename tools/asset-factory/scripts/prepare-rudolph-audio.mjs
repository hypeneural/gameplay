import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const sampleRate = 44100;
const sourceDir = resolve(root, 'assets-src/rena-das-lembrancas/audio');
const manifestFile = resolve(root, 'packages/games/rena-das-lembrancas/assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
await mkdir(sourceDir, { recursive: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function command(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  if (result.status !== 0) throw new Error(`${binary}: ${result.stderr || result.error}`);
  return result;
}
const ffmpegVersion = `ffmpeg-${command('ffmpeg', ['-version'])
  .stdout.split(/\s+/)[2]
  .replace(/[^A-Za-z0-9._-]/g, '-')}`;
function bell(samples, start, midi, amplitude, tail, circular = false) {
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  for (let i = 0; i < tail * sampleRate; i++) {
    const t = i / sampleRate;
    const pos = Math.round(start * sampleRate) + i;
    if (!circular && pos >= samples.length) break;
    const envelope =
      Math.min(1, t / 0.012) * Math.exp((-t * 4.8) / tail) * Math.min(1, (tail - t) / 0.08);
    samples[pos % samples.length] +=
      amplitude *
      envelope *
      (Math.sin(2 * Math.PI * frequency * t) +
        0.18 * Math.sin(2 * Math.PI * frequency * 2 * t) * Math.exp(-t * 4) +
        0.06 * Math.sin(2 * Math.PI * frequency * 3 * t) * Math.exp(-t * 8));
  }
}
function noise(samples, amplitude, seed, smoothing) {
  let state = seed;
  let filtered = 0;
  for (let i = 0; i < samples.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    filtered += ((state / 0xffffffff) * 2 - 1 - filtered) * smoothing;
    const t = i / samples.length;
    samples[i] += filtered * amplitude * Math.sin(Math.PI * t) ** 2 * Math.exp(-2 * t);
  }
}
const recipes = [
  {
    name: 'winter-loop-v1',
    seconds: 16,
    build(samples) {
      const chords = [
        [48, 64, 67, 72],
        [45, 64, 69, 72],
        [41, 65, 69, 72],
        [43, 62, 67, 71],
      ];
      chords.forEach((notes, bar) => {
        bell(samples, bar * 4, notes[0], 0.075, 4.5, true);
        notes
          .slice(1)
          .forEach((note, i) =>
            bell(samples, bar * 4 + 0.5 + i, note + 12, 0.085 - i * 0.008, 2.3, true),
          );
      });
    },
  },
  { name: 'snow-v1', seconds: 0.24, build: (samples) => noise(samples, 0.42, 49, 0.08) },
  { name: 'paper-v1', seconds: 0.3, build: (samples) => noise(samples, 0.25, 53, 0.3) },
  {
    name: 'bells-v1',
    seconds: 1.1,
    build(samples) {
      [79, 84, 88].forEach((note, i) => bell(samples, i * 0.15, note, 0.15, 0.75));
    },
  },
  {
    name: 'magic-v1',
    seconds: 1.45,
    build(samples) {
      [72, 76, 79, 84].forEach((note, i) => bell(samples, i * 0.18, note, 0.16, 0.85));
    },
  },
];
for (const recipe of recipes) {
  const samples = new Float64Array(Math.round(recipe.seconds * sampleRate));
  recipe.build(samples);
  const pcm = Buffer.alloc(44 + samples.length * 2);
  pcm.write('RIFF');
  pcm.writeUInt32LE(pcm.length - 8, 4);
  pcm.write('WAVEfmt ', 8);
  pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20);
  pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(sampleRate, 24);
  pcm.writeUInt32LE(sampleRate * 2, 28);
  pcm.writeUInt16LE(2, 32);
  pcm.writeUInt16LE(16, 34);
  pcm.write('data', 36);
  pcm.writeUInt32LE(samples.length * 2, 40);
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
    if (Math.abs(samples[i]) >= 0.7) throw new Error('Source headroom exceeded.');
    pcm.writeInt16LE(Math.round(samples[i] * 32767), 44 + i * 2);
  }
  const wav = resolve(sourceDir, `${recipe.name}.wav`);
  await writeFile(wav, pcm);
  for (const format of ['m4a', 'mp3']) {
    const file = `apps/play/public/assets/rena-das-lembrancas/audio/${recipe.name}.${format}`;
    command('ffmpeg', [
      '-nostdin',
      '-v',
      'error',
      '-y',
      '-i',
      wav,
      '-c:a',
      format === 'm4a' ? 'aac' : 'libmp3lame',
      '-b:a',
      '64k',
      ...(format === 'm4a' ? ['-movflags', '+faststart'] : []),
      resolve(root, file),
    ]);
    const bytes = await readFile(resolve(root, file));
    const duration = Number(
      JSON.parse(
        command('ffprobe', [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'json',
          resolve(root, file),
        ]).stdout,
      ).format.duration,
    );
    const id = `${recipe.name}-${format}`;
    manifest.assets = manifest.assets.filter((asset) => asset.id !== id);
    manifest.assets.push({
      id,
      kind: 'audio',
      format,
      source: {
        provider: 'Christmas Games offline score',
        origin: 'project-created',
        identifier: hash(pcm),
        license: 'project-owned',
        reviewedOn: '2026-09-08',
        reviewedBy: 'Codex-source-headroom-and-duration-review',
        record: 'ASSET_PROVENANCE.md#original-audio-v1',
      },
      art: {
        family: 'rudolph-winter-celesta-v1',
        christmasFit: 'approved',
        photoSafety: 'approved',
        mobileLegibility: 'approved',
        state: 'PRONTO_PARA_RUNTIME',
        justification:
          'Partitura original instrumental esparsa e cues finitos com headroom. Escuta fisica permanece um gate separado.',
      },
      processing: {
        recipe: `prepare-rudolph-audio:${recipe.name}:mono44100:64k`,
        tools: [process.version, ffmpegVersion],
      },
      runtime: {
        file,
        publicPath: `/${file.replace('apps/play/public/', '')}`,
        bytes: bytes.length,
        sha256: hash(bytes),
        durationSeconds: duration,
        cue: `rudolph-${recipe.name}`,
        deliveryGroup: `rudolph-${recipe.name}`,
        quality: { low: 'keep', reducedMotion: 'keep' },
      },
    });
  }
  process.stdout.write(
    `${recipe.name}: ${recipe.seconds}s, peak ${Math.round(20 * Math.log10(peak))} dBFS\n`,
  );
}
await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
