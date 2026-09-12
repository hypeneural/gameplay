import type {
  MosaicEffect,
  MosaicEngineState,
  MosaicInputFrame,
  MosaicRules,
} from './EngineTypes.js';
import { applyReliefRows } from './MosaicBoard.js';
import {
  createMosaicMemoryFrame,
  resolveMosaicMemoryFrame,
  type MosaicMemoryFrameEffect,
  type MosaicMemoryFrameState,
} from './MosaicMemoryFrame.js';
import {
  completeMosaicRecovery,
  createMosaicProgress,
  resolveMosaicProgress,
  type MosaicMode,
  type MosaicProgressEffect,
  type MosaicProgressState,
} from './MosaicProgress.js';
import { planMosaicRecovery } from './MosaicRecoveryPolicy.js';
import { rulesForMosaicMode } from './MosaicRules.js';
import { advanceMosaicSimulation, createMosaicEngine } from './MosaicSimulation.js';

export interface MosaicExperienceState {
  readonly engine: MosaicEngineState;
  readonly progress: MosaicProgressState;
  readonly memoryFrame: MosaicMemoryFrameState;
}

export type MosaicExperienceEffect =
  | MosaicEffect
  | MosaicProgressEffect
  | MosaicMemoryFrameEffect
  | { readonly type: 'rows-relieved'; readonly rows: readonly number[] };

export interface MosaicExperienceTransition {
  readonly state: MosaicExperienceState;
  readonly effects: readonly MosaicExperienceEffect[];
}

export function createMosaicExperience(
  mode: MosaicMode = 'normal',
  runSeed = 1,
  materialSlotCount = 1,
): MosaicExperienceState {
  return {
    engine: createMosaicEngine(runSeed, materialSlotCount),
    progress: createMosaicProgress(mode),
    memoryFrame: createMosaicMemoryFrame(),
  };
}

/** Advances mechanics first, then derives product feedback from its ordered effects. */
export function advanceMosaicExperience(
  state: MosaicExperienceState,
  input: MosaicInputFrame,
  rules: MosaicRules = rulesForMosaicMode(state.progress.mode),
): MosaicExperienceTransition {
  const engine = advanceMosaicSimulation(state.engine, input, rules);
  return resolveMosaicExperience({ ...state, engine: engine.state }, engine.effects);
}

/** Reduces engine effects without changing the engine, board, queue or random streams. */
export function resolveMosaicExperience(
  state: MosaicExperienceState,
  engineEffects: readonly MosaicEffect[],
): MosaicExperienceTransition {
  const progress = resolveProductProgress(state, engineEffects);
  const memoryFrame = resolveMosaicMemoryFrame(state.memoryFrame, progress.state, engineEffects);
  const deferredTerminalEffects = progress.effects.filter(
    (effect) => effect.type === 'target-reached',
  );
  const immediateProgressEffects = progress.effects.filter(
    (effect) => effect.type !== 'target-reached',
  );
  return {
    state: {
      ...state,
      progress: progress.state,
      memoryFrame: memoryFrame.state,
    },
    effects: [
      ...engineEffects,
      ...immediateProgressEffects,
      ...memoryFrame.effects,
      ...deferredTerminalEffects,
    ],
  };
}

/** Applies the finite Workshop Relief after the presentation has acknowledged its request. */
export function applyMosaicWorkshopRelief(
  state: MosaicExperienceState,
): MosaicExperienceTransition {
  if (state.progress.phase !== 'recovering')
    throw new Error('Workshop Relief can only run while the ruleset is recovering.');
  const plan = planMosaicRecovery(state.engine.board, state.progress.recoveryCount);
  if (plan === null) throw new Error('Workshop Relief requires at least one visible occupied row.');

  const resumed: MosaicEngineState = {
    ...state.engine,
    board: applyReliefRows(state.engine.board, plan.rows),
    active: null,
    phase: 'entry-delay',
    grounded: false,
    pendingClearRows: [],
    pendingLockSerial: null,
    phaseTicks: 0,
    gravityTicks: 0,
    lockTicks: 0,
    lastHorizontalPress: null,
    horizontalHoldTicks: 0,
  };
  return {
    state: {
      ...state,
      engine: resumed,
      progress: completeMosaicRecovery(state.progress),
    },
    effects: [{ type: 'rows-relieved', rows: plan.rows }],
  };
}

function resolveProductProgress(
  state: MosaicExperienceState,
  engineEffects: readonly MosaicEffect[],
): { readonly state: MosaicProgressState; readonly effects: readonly MosaicProgressEffect[] } {
  const transition = resolveMosaicProgress(state.progress, engineEffects);
  if (transition.state.phase !== 'recovering') return transition;
  if (planMosaicRecovery(state.engine.board, transition.state.recoveryCount) !== null)
    return transition;
  return {
    state: { ...transition.state, phase: 'top-out' },
    effects: [{ type: 'top-out-unrecovered' }],
  };
}
