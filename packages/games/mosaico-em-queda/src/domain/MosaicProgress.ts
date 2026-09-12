import type { MosaicEffect } from './EngineTypes.js';

export type MosaicMode = 'normal' | 'desafio';
export type MosaicProgressPhase = 'playing' | 'recovering' | 'completed' | 'top-out';

export interface MosaicProgressState {
  readonly mode: MosaicMode;
  readonly targetLines: 4 | 7;
  readonly clearedLines: number;
  readonly recoveryCount: number;
  readonly phase: MosaicProgressPhase;
}

export type MosaicProgressEffect =
  | {
      readonly type: 'progress-changed';
      readonly clearedLines: number;
      readonly targetLines: 4 | 7;
    }
  | { readonly type: 'target-reached' }
  | { readonly type: 'recovery-requested' }
  | { readonly type: 'top-out-unrecovered' };

export function createMosaicProgress(mode: MosaicMode = 'normal'): MosaicProgressState {
  return {
    mode,
    targetLines: mode === 'normal' ? 4 : 7,
    clearedLines: 0,
    recoveryCount: 0,
    phase: 'playing',
  };
}

export function resolveMosaicProgress(
  progress: MosaicProgressState,
  effects: readonly MosaicEffect[],
): { readonly state: MosaicProgressState; readonly effects: readonly MosaicProgressEffect[] } {
  const cleared = effects
    .filter((effect) => effect.type === 'lines-cleared')
    .reduce((sum, effect) => sum + effect.rows.length, 0);
  if (cleared > 0) {
    const clearedLines = progress.clearedLines + cleared;
    const reached = clearedLines >= progress.targetLines;
    return {
      state: { ...progress, clearedLines, phase: reached ? 'completed' : progress.phase },
      effects: [
        { type: 'progress-changed', clearedLines, targetLines: progress.targetLines },
        ...(reached ? ([{ type: 'target-reached' }] as const) : []),
      ],
    };
  }
  if (effects.some((effect) => effect.type === 'top-out')) {
    const maxRecoveries = progress.mode === 'normal' ? 2 : 1;
    const recoverable = progress.recoveryCount < maxRecoveries;
    return {
      state: { ...progress, phase: recoverable ? 'recovering' : 'top-out' },
      effects: [{ type: recoverable ? 'recovery-requested' : 'top-out-unrecovered' }],
    };
  }
  return { state: progress, effects: [] };
}

export function completeMosaicRecovery(progress: MosaicProgressState): MosaicProgressState {
  if (progress.phase !== 'recovering')
    throw new Error('Recovery can only complete from recovering phase.');
  return { ...progress, recoveryCount: progress.recoveryCount + 1, phase: 'playing' };
}
