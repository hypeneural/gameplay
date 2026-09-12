import type { MemorySoundCue } from './audioAssets.js';

export const memoryMusicBaseVolume = 0.12;

interface MemoryMusicDuck {
  readonly downDurationMs: number;
  readonly holdDurationMs: number;
  readonly restoreDurationMs: number;
  readonly targetVolume: number;
}

const soundRatesByCue: Readonly<Record<MemorySoundCue, readonly number[]>> = {
  'card.flip': [0.98, 1.03],
  'card.return': [0.97, 1],
  'hint.magic': [0.98, 1.02],
  'pair.match': [0.96, 1, 1.04],
  'ui.button': [0.98, 1.02],
  'winter.win': [1],
};

const musicDuckByCue: Readonly<Partial<Record<MemorySoundCue, MemoryMusicDuck>>> = {
  'pair.match': {
    downDurationMs: 80,
    holdDurationMs: 260,
    restoreDurationMs: 260,
    targetVolume: 0.09,
  },
  'winter.win': {
    downDurationMs: 120,
    holdDurationMs: 950,
    restoreDurationMs: 420,
    targetVolume: 0.065,
  },
};

/** Repeats a tiny, deterministic set of approved variations without randomness. */
export function memorySoundRateForCue(cue: MemorySoundCue, occurrence: number): number {
  const rates = soundRatesByCue[cue];
  return rates[Math.max(0, occurrence) % rates.length]!;
}

/** Match yields briefly clear the mix; the final celebration has the deeper duck. */
export function memoryMusicDuckForCue(cue: MemorySoundCue): MemoryMusicDuck | undefined {
  return musicDuckByCue[cue];
}
