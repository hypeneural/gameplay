import type { MosaicEffect } from './EngineTypes.js';
import type { MosaicProgressState } from './MosaicProgress.js';

export type MosaicMemoryFrameSlot = 'anchor' | 'memory-1' | 'memory-2' | 'memory-3';

export interface MosaicMemoryFrameState {
  readonly slot: MosaicMemoryFrameSlot;
  /** The most recent lock that may earn a frame update after its clear delay. */
  readonly pendingLockSerial: number | null;
  readonly lastResolvedLockSerial: number | null;
}

export type MosaicMemoryFrameEffect = {
  readonly type: 'memory-frame-changed';
  readonly pieceSerial: number;
  readonly slot: MosaicMemoryFrameSlot;
};

export function createMosaicMemoryFrame(): MosaicMemoryFrameState {
  return { slot: 'anchor', pendingLockSerial: null, lastResolvedLockSerial: null };
}

/**
 * Converts semantic lock/clear events into at most one Frame update per piece.
 * The slot is symbolic only; photo selection remains a later, URL-free plan.
 */
export function resolveMosaicMemoryFrame(
  frame: MosaicMemoryFrameState,
  progress: MosaicProgressState,
  effects: readonly MosaicEffect[],
): {
  readonly state: MosaicMemoryFrameState;
  readonly effects: readonly MosaicMemoryFrameEffect[];
} {
  const locked = findMostRecentLock(effects);
  const pendingLockSerial = locked?.serial ?? frame.pendingLockSerial;
  const cleared = effects.some((effect) => effect.type === 'lines-cleared');
  if (!cleared || pendingLockSerial === null || pendingLockSerial === frame.lastResolvedLockSerial)
    return {
      state:
        pendingLockSerial === frame.pendingLockSerial ? frame : { ...frame, pendingLockSerial },
      effects: [],
    };

  const slot = slotForProgress(progress);
  const state: MosaicMemoryFrameState = {
    slot,
    pendingLockSerial: null,
    lastResolvedLockSerial: pendingLockSerial,
  };
  return {
    state,
    effects:
      slot === frame.slot
        ? []
        : [{ type: 'memory-frame-changed', pieceSerial: pendingLockSerial, slot }],
  };
}

function slotForProgress(progress: MosaicProgressState): MosaicMemoryFrameSlot {
  if (progress.phase === 'completed') return 'anchor';
  const stage = Math.min(3, Math.floor((progress.clearedLines * 4) / progress.targetLines));
  return stage === 3 ? 'memory-3' : stage === 2 ? 'memory-2' : stage === 1 ? 'memory-1' : 'anchor';
}

function findMostRecentLock(
  effects: readonly MosaicEffect[],
): Extract<MosaicEffect, { type: 'piece-locked' }> | null {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index];
    if (effect?.type === 'piece-locked') return effect;
  }
  return null;
}
