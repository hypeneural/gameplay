import type { MosaicEngineState, MosaicInputFrame, MosaicRules } from './EngineTypes.js';
import { advanceMosaicSimulation, createMosaicEngine } from './MosaicSimulation.js';

export const MOSAIC_ENGINE_VERSION = 1;
export const MOSAIC_INPUT_ENCODING_VERSION = 1;

export interface MosaicReplayRecord {
  readonly engineVersion: 1;
  readonly inputEncodingVersion: 1;
  readonly runSeed: number;
  readonly materialSlotCount: number;
  readonly frames: readonly MosaicInputFrame[];
}

export interface MosaicReplayCheckpoint {
  readonly tick: number;
  readonly digest: string;
}

export function replayMosaicRun(
  replay: MosaicReplayRecord,
  rules: MosaicRules,
  checkpointEveryTicks = 300,
): { readonly state: MosaicEngineState; readonly checkpoints: readonly MosaicReplayCheckpoint[] } {
  assertReplayVersion(replay);
  let state = createMosaicEngine(replay.runSeed, replay.materialSlotCount);
  const checkpoints: MosaicReplayCheckpoint[] = [];
  for (const frame of replay.frames) {
    state = advanceMosaicSimulation(state, frame, rules).state;
    if (state.tick % checkpointEveryTicks === 0)
      checkpoints.push({ tick: state.tick, digest: mosaicStateDigest(state) });
  }
  return { state, checkpoints };
}

/** Stable, privacy-safe fingerprint of mechanics only. It excludes photo IDs, URLs and material slots. */
export function mosaicStateDigest(state: MosaicEngineState): string {
  const cells = state.board.cells.map((cell) => (cell === null ? '-' : cell.pieceSerial)).join(',');
  const active =
    state.active === null
      ? '-'
      : `${state.active.kind}:${state.active.rotation}:${state.active.column}:${state.active.row}:${state.active.serial}`;
  return [
    state.tick,
    state.phase,
    active,
    state.next,
    state.bag.join(''),
    state.pieceRandom.state,
    state.materialRandom.state,
    state.gravityTicks,
    state.lockTicks,
    state.lockResetCount,
    state.pendingClearRows.join(','),
    state.pendingLockSerial ?? '-',
    cells,
  ].join('|');
}

function assertReplayVersion(replay: MosaicReplayRecord): void {
  if (
    replay.engineVersion !== MOSAIC_ENGINE_VERSION ||
    replay.inputEncodingVersion !== MOSAIC_INPUT_ENCODING_VERSION
  ) {
    throw new Error('Unsupported Mosaico replay version.');
  }
}
