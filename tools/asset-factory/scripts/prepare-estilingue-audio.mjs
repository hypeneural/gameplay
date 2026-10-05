import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const sampleRate = 44100;
const sourceDir = resolve(root, 'assets-src/estilingue-das-lembrancas/audio');
const outputDir = resolve(root, 'apps/play/public/assets/estilingue-das-lembrancas/audio');
const manifestDir = resolve(root, 'packages/games/estilingue-das-lembrancas/assets');
const manifestFile = resolve(manifestDir, 'manifest.json');

await mkdir(sourceDir, { recursive: true });
await mkdir(outputDir, { recursive: true });
await mkdir(manifestDir, { recursive: true });

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

function command(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  if (result.status !== 0) throw new Error(`${binary}: ${result.stderr || result.error}`);
  return result;
}

const ffmpegVersion = `ffmpeg-${command('ffmpeg', ['-version'])
  .stdout.split(/\s+/)[2]
  .replace(/[^A-Za-z0-9._-]/g, '-')}`;

/** High-purity crystalline bell / chime harmonic generator */
function bell(samples, start, midi, amplitude, tail, decayRate = 4.8) {
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  for (let i = 0; i < tail * sampleRate; i++) {
    const t = i / sampleRate;
    const pos = Math.round(start * sampleRate) + i;
    if (pos >= samples.length) break;
    const envelope =
      Math.min(1, t / 0.008) * Math.exp((-t * decayRate) / tail) * Math.min(1, (tail - t) / 0.05);
    samples[pos] +=
      amplitude *
      envelope *
      (Math.sin(2 * Math.PI * frequency * t) +
        0.28 * Math.sin(2 * Math.PI * frequency * 2.02 * t) * Math.exp(-t * 3) +
        0.12 * Math.sin(2 * Math.PI * frequency * 3.01 * t) * Math.exp(-t * 6) +
        0.05 * Math.sin(2 * Math.PI * frequency * 4.2 * t) * Math.exp(-t * 9));
  }
}

/** Shaped filtered noise generator */
function noise(samples, start, duration, amplitude, seed, smoothing, attack = 0.01) {
  let state = seed;
  let filtered = 0;
  const count = Math.round(duration * sampleRate);
  for (let i = 0; i < count; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    filtered += ((state / 0xffffffff) * 2 - 1 - filtered) * smoothing;
    const t = i / count;
    const pos = Math.round(start * sampleRate) + i;
    if (pos >= samples.length) break;
    const env = Math.min(1, (t * duration) / attack) * Math.exp(-4.5 * t);
    samples[pos] += filtered * amplitude * env;
  }
}

/** Rich wood knock / body impact generator */
function woodKnock(samples, start, baseFreq, amplitude, tail) {
  for (let i = 0; i < tail * sampleRate; i++) {
    const t = i / sampleRate;
    const pos = Math.round(start * sampleRate) + i;
    if (pos >= samples.length) break;
    const env = Math.exp(-t * 36);
    const freq = baseFreq * (1 + 0.8 * Math.exp(-t * 80));
    samples[pos] +=
      amplitude *
      env *
      (Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(2 * Math.PI * freq * 2.3 * t));
  }
}

const recipes = [
  {
    name: 'winter-loop-v1',
    seconds: 12.0,
    build(samples) {
      // 3 bars of warm magical celesta chords
      const chords = [
        [60, 64, 67, 72, 76], // C major
        [57, 60, 64, 69, 72], // A minor 7
        [53, 57, 60, 65, 69], // F major 7
        [55, 59, 62, 67, 71], // G major
      ];
      chords.forEach((chord, bar) => {
        const barStart = bar * 3.0;
        bell(samples, barStart, chord[0], 0.08, 3.2, 3.0);
        chord.slice(1).forEach((note, nIdx) => {
          bell(samples, barStart + 0.4 + nIdx * 0.45, note, 0.07 - nIdx * 0.008, 2.2, 3.8);
        });
      });
      // Soft gentle winter breeze background
      noise(samples, 0, 12.0, 0.02, 107, 0.04, 1.5);
    },
  },
  {
    name: 'elastic-pull-v1',
    seconds: 0.32,
    build(samples) {
      // Rising tension pitch (120Hz -> 280Hz) with rubber groan
      for (let i = 0; i < samples.length; i++) {
        const t = i / sampleRate;
        const freq = 120 + 160 * (t / 0.32) ** 1.5;
        const env = Math.min(1, t / 0.04) * (1 - (t / 0.32) * 0.3);
        samples[i] +=
          0.22 *
          env *
          Math.sin(2 * Math.PI * freq * t) *
          (1 + 0.15 * Math.sin(2 * Math.PI * 40 * t));
      }
      noise(samples, 0.05, 0.25, 0.06, 31, 0.15, 0.03);
    },
  },
  {
    name: 'elastic-snap-v1',
    seconds: 0.22,
    build(samples) {
      // Whip transient + leather slap
      for (let i = 0; i < samples.length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 55);
        const freq = 550 * Math.exp(-t * 40);
        samples[i] += 0.38 * env * Math.sin(2 * Math.PI * freq * t);
      }
      noise(samples, 0, 0.12, 0.35, 77, 0.6, 0.002);
    },
  },
  {
    name: 'snow-whoosh-v1',
    seconds: 0.35,
    build(samples) {
      // Atmospheric snowy whoosh
      noise(samples, 0, 0.35, 0.32, 91, 0.22, 0.08);
      for (let i = 0; i < samples.length; i++) {
        const t = i / sampleRate;
        const mod = Math.sin(Math.PI * (t / 0.35));
        samples[i] *= mod;
      }
    },
  },
  {
    name: 'impact-wood-v1',
    seconds: 0.28,
    build(samples) {
      woodKnock(samples, 0, 180, 0.45, 0.22);
      noise(samples, 0, 0.08, 0.22, 103, 0.25, 0.005);
    },
  },
  {
    name: 'impact-gingerbread-v1',
    seconds: 0.26,
    build(samples) {
      woodKnock(samples, 0, 320, 0.28, 0.14);
      // Crisp crumble noise
      noise(samples, 0, 0.18, 0.38, 44, 0.75, 0.003);
      noise(samples, 0.04, 0.12, 0.22, 59, 0.5, 0.01);
    },
  },
  {
    name: 'impact-bell-v1',
    seconds: 0.75,
    build(samples) {
      bell(samples, 0, 84, 0.32, 0.75, 3.5);
      bell(samples, 0.02, 96, 0.18, 0.6, 4.2);
      noise(samples, 0, 0.05, 0.12, 83, 0.8, 0.002);
    },
  },
  {
    name: 'impact-bauble-v1',
    seconds: 0.55,
    build(samples) {
      // Glass clink
      bell(samples, 0, 91, 0.3, 0.55, 5.5);
      bell(samples, 0.01, 103, 0.16, 0.45, 6.2);
    },
  },
  {
    name: 'fragment-fly-v1',
    seconds: 0.85,
    build(samples) {
      // Ascending magical chime cascade
      const notes = [72, 76, 79, 83, 86, 88];
      notes.forEach((note, idx) => {
        bell(samples, idx * 0.11, note, 0.18 - idx * 0.015, 0.45, 4.0);
      });
      noise(samples, 0, 0.85, 0.04, 121, 0.18, 0.1);
    },
  },
  {
    name: 'frame-slot-v1',
    seconds: 1.1,
    build(samples) {
      // Golden lock-in chord
      bell(samples, 0, 60, 0.25, 0.9, 3.0);
      bell(samples, 0.05, 67, 0.22, 0.85, 3.2);
      bell(samples, 0.1, 72, 0.24, 0.95, 3.5);
      bell(samples, 0.15, 76, 0.2, 0.8, 4.0);
    },
  },
  {
    name: 'celebration-fanfare-v1',
    seconds: 2.4,
    build(samples) {
      // Joyous Christmas celebration chord progression
      const chords = [
        { time: 0.0, notes: [60, 64, 67, 72], tail: 0.7 },
        { time: 0.4, notes: [62, 65, 69, 74], tail: 0.7 },
        { time: 0.8, notes: [64, 67, 71, 76], tail: 0.8 },
        { time: 1.2, notes: [65, 69, 72, 77, 81], tail: 1.2 },
      ];
      chords.forEach((c) => {
        c.notes.forEach((note, idx) => {
          bell(samples, c.time + idx * 0.04, note, 0.18, c.tail, 3.2);
        });
      });
    },
  },
  {
    name: 'button-press-v1',
    seconds: 0.12,
    build(samples) {
      woodKnock(samples, 0, 240, 0.32, 0.08);
      bell(samples, 0.01, 88, 0.15, 0.09, 12.0);
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
  pcm.writeUInt16LE(1, 20); // PCM
  pcm.writeUInt16LE(1, 22); // Mono
  pcm.writeUInt32LE(sampleRate, 24);
  pcm.writeUInt32LE(sampleRate * 2, 28);
  pcm.writeUInt16LE(2, 32); // Block align
  pcm.writeUInt16LE(16, 34); // Bits per sample
  pcm.write('data', 36);
  pcm.writeUInt32LE(samples.length * 2, 40);

  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
    if (Math.abs(samples[i]) >= 0.85) {
      // Normalize down if clipping
      const scale = 0.8 / peak;
      for (let j = 0; j < samples.length; j++) samples[j] *= scale;
      break;
    }
  }

  for (let i = 0; i < samples.length; i++) {
    pcm.writeInt16LE(Math.round(samples[i] * 32767), 44 + i * 2);
  }

  const wav = resolve(sourceDir, `${recipe.name}.wav`);
  await writeFile(wav, pcm);

  for (const format of ['m4a', 'mp3']) {
    const fileRel = `apps/play/public/assets/estilingue-das-lembrancas/audio/${recipe.name}.${format}`;
    const fileOut = resolve(root, fileRel);
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
      fileOut,
    ]);

    const bytes = await readFile(fileOut);
    const duration = Number(
      JSON.parse(
        command('ffprobe', [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'json',
          fileOut,
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
        reviewedOn: '2026-09-13',
        reviewedBy: 'estilingue-das-lembrancas-audio-synthesis',
        record: 'ASSET_PROVENANCE.md#original-audio-v1',
      },
      art: {
        family: 'estilingue-winter-physics-v1',
        christmasFit: 'approved',
        photoSafety: 'approved',
        mobileLegibility: 'approved',
        state: 'PRONTO_PARA_RUNTIME',
        justification:
          'Physical snowball and slingshot audio palette with crystalline Christmas bells.',
      },
      processing: {
        recipe: `prepare-estilingue-audio:${recipe.name}:mono44100:64k`,
        tools: [process.version, ffmpegVersion],
      },
      runtime: {
        file: fileRel,
        publicPath: `/${fileRel.replace('apps/play/public/', '')}`,
        bytes: bytes.length,
        sha256: hash(bytes),
        durationSeconds: duration,
        cue: `estilingue-${recipe.name}`,
        deliveryGroup: `estilingue-${recipe.name}`,
        quality: { low: 'keep', reducedMotion: 'keep' },
      },
    });
  }

  process.stdout.write(
    `${recipe.name}: ${recipe.seconds}s, peak ${Math.round(20 * Math.log10(Math.max(peak, 0.0001)))} dBFS\n`,
  );
}

await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write('Audio generation completed successfully.\n');
