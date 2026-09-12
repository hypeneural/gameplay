import {
  MOSAIC_BUFFER_ROWS,
  type MosaicEffect,
  type MosaicEngineState,
  type MosaicInputFrame,
  type MosaicRules,
  type MosaicTransition,
} from './EngineTypes.js';
import {
  clearCompleteRows,
  createActiveTetromino,
  createEmptyMosaicBoard,
  findCompleteRows,
  fitsTetromino,
  lockTetromino,
} from './MosaicBoard.js';
import {
  deriveMosaicSeed,
  createMosaicRandom,
  takeMaterialSlot,
  takeNextTetromino,
} from './SevenBag.js';
import { tryRotateClockwise } from './SrsRotation.js';
import { isMosaicLockOut } from './MosaicTopOut.js';

const SPAWN_COLUMN = 2;
// The four buffer rows still protect rotation and top-out semantics, but an
// opening photo-piece must be visible on the first paint. The piece starts on
// the buffer edge, so its lower minos are already on the mural without
// changing collision, streams or the fixed-step contract.
const SPAWN_ROW = MOSAIC_BUFFER_ROWS - 1;

export function emptyMosaicInput(): MosaicInputFrame {
  return {
    leftPressed: false,
    leftHeld: false,
    rightPressed: false,
    rightHeld: false,
    rotateCWPressed: false,
    softDropPressed: false,
  };
}

export function createMosaicEngine(runSeed: number, materialSlotCount = 1): MosaicEngineState {
  const first = takeNextTetromino([], createMosaicRandom(deriveMosaicSeed(runSeed, 'pieces')));
  const next = takeNextTetromino(first.bag, first.random);
  const material = takeMaterialSlot(
    createMosaicRandom(deriveMosaicSeed(runSeed, 'materials')),
    materialSlotCount,
  );
  const active = createActiveTetromino(
    first.kind,
    0,
    SPAWN_COLUMN,
    SPAWN_ROW,
    material.materialSlot,
    1,
  );
  const board = createEmptyMosaicBoard();
  return {
    board,
    active,
    next: next.kind,
    bag: next.bag,
    pieceRandom: next.random,
    materialRandom: material.random,
    phase: fitsTetromino(board, active) ? 'active' : 'top-out',
    grounded: false,
    pendingClearRows: [],
    pendingLockSerial: null,
    phaseTicks: 0,
    tick: 0,
    gravityTicks: 0,
    lockTicks: 0,
    lockResetCount: 0,
    lastHorizontalPress: null,
    horizontalHoldTicks: 0,
    nextPieceSerial: 2,
    materialSlotCount,
  };
}

export function advanceMosaicSimulation(
  state: MosaicEngineState,
  input: MosaicInputFrame,
  rules: MosaicRules,
): MosaicTransition {
  if (state.phase === 'top-out') return { state: { ...state, tick: state.tick + 1 }, effects: [] };
  if (state.phase === 'line-clear-delay') return advanceClearDelay(state, rules);
  if (state.phase === 'entry-delay')
    return state.phaseTicks + 1 >= rules.spawnDelayTicks
      ? spawnNext(state)
      : {
          state: { ...state, tick: state.tick + 1, phaseTicks: state.phaseTicks + 1 },
          effects: [],
        };
  return advanceActive(state, input, rules);
}

function advanceActive(
  state: MosaicEngineState,
  input: MosaicInputFrame,
  rules: MosaicRules,
): MosaicTransition {
  let active = state.active;
  if (active === null) return spawnNext(state);
  const effects: MosaicEffect[] = [];
  let moved = false;
  if (input.rotateCWPressed) {
    const rotated = tryRotateClockwise(state.board, active);
    if (rotated !== null) {
      active = rotated;
      moved = true;
      effects.push({ type: 'piece-rotated', serial: active.serial });
    }
  }
  const horizontal = resolveHorizontal(input, state, rules);
  if (
    horizontal.move &&
    fitsTetromino(state.board, { ...active, column: active.column + horizontal.move })
  ) {
    active = { ...active, column: active.column + horizontal.move };
    moved = true;
    effects.push({ type: 'piece-moved', serial: active.serial });
  }
  if (input.softDropPressed && fitsTetromino(state.board, { ...active, row: active.row + 1 })) {
    active = { ...active, row: active.row + 1 };
    moved = true;
    effects.push({ type: 'piece-moved', serial: active.serial });
  }
  const gravityTicks = state.gravityTicks + 1;
  if (
    !input.softDropPressed &&
    gravityTicks >= rules.gravityIntervalTicks &&
    fitsTetromino(state.board, { ...active, row: active.row + 1 })
  ) {
    active = { ...active, row: active.row + 1 };
    moved = true;
    effects.push({ type: 'piece-moved', serial: active.serial });
  }
  const grounded = !fitsTetromino(state.board, { ...active, row: active.row + 1 });
  if (grounded && !state.grounded) effects.push({ type: 'piece-grounded', serial: active.serial });
  const reset = state.grounded && moved && state.lockResetCount < rules.maxLockResets;
  const lockTicks = grounded ? (reset ? 0 : state.lockTicks + 1) : 0;
  const next: MosaicEngineState = {
    ...state,
    active,
    tick: state.tick + 1,
    grounded,
    gravityTicks: gravityTicks >= rules.gravityIntervalTicks ? 0 : gravityTicks,
    lockTicks,
    lockResetCount: reset ? state.lockResetCount + 1 : state.lockResetCount,
    lastHorizontalPress: horizontal.direction,
    horizontalHoldTicks: horizontal.holdTicks,
  };
  return grounded && lockTicks >= rules.lockDelayTicks
    ? lockActive(next, effects, rules)
    : { state: next, effects };
}

function resolveHorizontal(
  input: MosaicInputFrame,
  state: MosaicEngineState,
  rules: MosaicRules,
): {
  readonly direction: MosaicEngineState['lastHorizontalPress'];
  readonly holdTicks: number;
  readonly move: -1 | 0 | 1;
} {
  const leftOnly = input.leftHeld && !input.rightHeld;
  const rightOnly = input.rightHeld && !input.leftHeld;
  const pressedDirection =
    input.leftPressed === input.rightPressed ? null : input.leftPressed ? 'left' : 'right';
  const direction =
    pressedDirection ??
    (leftOnly
      ? 'left'
      : rightOnly
        ? 'right'
        : input.leftHeld && input.rightHeld
          ? state.lastHorizontalPress
          : null);
  if (direction === null) return { direction: null, holdTicks: 0, move: 0 };
  const changed = direction !== state.lastHorizontalPress;
  const holdTicks = changed || pressedDirection !== null ? 0 : state.horizontalHoldTicks + 1;
  const shouldRepeat =
    holdTicks >= rules.dasTicks && (holdTicks - rules.dasTicks) % rules.arrTicks === 0;
  return {
    direction,
    holdTicks,
    move:
      changed || pressedDirection !== null || shouldRepeat ? (direction === 'left' ? -1 : 1) : 0,
  };
}

function lockActive(
  state: MosaicEngineState,
  effects: MosaicEffect[],
  rules: MosaicRules,
): MosaicTransition {
  if (state.active === null) throw new Error('Active phase requires a tetromino.');
  const board = lockTetromino(state.board, state.active);
  const rows = findCompleteRows(board);
  effects.push({ type: 'piece-locked', serial: state.active.serial });
  if (rows.length > 0) effects.push({ type: 'lines-detected', rows });
  const locked: MosaicTransition = {
    state: {
      ...state,
      board,
      active: null,
      phase: rows.length > 0 ? 'line-clear-delay' : 'entry-delay',
      pendingClearRows: rows,
      pendingLockSerial: state.active.serial,
      phaseTicks: 0,
      grounded: false,
      lockTicks: 0,
    },
    effects,
  };
  if (rows.length === 0 && isMosaicLockOut(board, state.active.serial)) {
    return {
      state: { ...locked.state, phase: 'top-out' },
      effects: [...effects, { type: 'top-out', reason: 'lock-out' }],
    };
  }
  if (rows.length > 0 || rules.spawnDelayTicks > 0) return locked;
  // A configured zero is a real zero: the old piece locks and the next piece
  // becomes active in this transition, without a blank simulation frame.
  const spawned = spawnNext(locked.state, 0);
  return { state: spawned.state, effects: [...locked.effects, ...spawned.effects] };
}

function advanceClearDelay(state: MosaicEngineState, rules: MosaicRules): MosaicTransition {
  if (state.phaseTicks + 1 < rules.lineClearDelayTicks)
    return {
      state: { ...state, tick: state.tick + 1, phaseTicks: state.phaseTicks + 1 },
      effects: [],
    };
  const rows = state.pendingClearRows;
  const board = clearCompleteRows(state.board, rows);
  const lockedOut =
    state.pendingLockSerial !== null && isMosaicLockOut(board, state.pendingLockSerial);
  const cleared: MosaicTransition = {
    state: {
      ...state,
      tick: state.tick + 1,
      board,
      phase: lockedOut ? 'top-out' : 'entry-delay',
      pendingClearRows: [],
      pendingLockSerial: null,
      phaseTicks: 0,
    },
    effects: [{ type: 'lines-cleared', rows }],
  };
  if (lockedOut) {
    return {
      state: { ...cleared.state, phase: 'top-out' },
      effects: [...cleared.effects, { type: 'top-out', reason: 'lock-out' }],
    };
  }
  if (rules.spawnDelayTicks > 0) return cleared;
  // Completing the clear must not reintroduce an empty entry-delay frame.
  const spawned = spawnNext(cleared.state, 0);
  return { state: spawned.state, effects: [...cleared.effects, ...spawned.effects] };
}

function spawnNext(state: MosaicEngineState, tickIncrement = 1): MosaicTransition {
  const upcoming = takeNextTetromino(state.bag, state.pieceRandom);
  const material = takeMaterialSlot(state.materialRandom, state.materialSlotCount);
  const active = createActiveTetromino(
    state.next,
    0,
    SPAWN_COLUMN,
    SPAWN_ROW,
    material.materialSlot,
    state.nextPieceSerial,
  );
  if (!fitsTetromino(state.board, active))
    return {
      state: {
        ...state,
        tick: state.tick + tickIncrement,
        active: null,
        phase: 'top-out',
        pendingClearRows: [],
        pendingLockSerial: null,
      },
      effects: [{ type: 'top-out', reason: 'block-out' }],
    };
  return {
    state: {
      ...state,
      tick: state.tick + tickIncrement,
      active,
      next: upcoming.kind,
      bag: upcoming.bag,
      pieceRandom: upcoming.random,
      materialRandom: material.random,
      phase: 'active',
      phaseTicks: 0,
      pendingClearRows: [],
      pendingLockSerial: null,
      gravityTicks: 0,
      lockTicks: 0,
      lockResetCount: 0,
      nextPieceSerial: state.nextPieceSerial + 1,
    },
    effects: [{ type: 'piece-spawned', serial: active.serial }],
  };
}
