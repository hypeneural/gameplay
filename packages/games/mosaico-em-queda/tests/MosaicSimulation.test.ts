import { describe, expect, it } from 'vitest';
import {
  advanceMosaicSimulation,
  createMosaicEngine,
  createActiveTetromino,
  createEmptyMosaicBoard,
  emptyMosaicInput,
  MOSAIC_BUFFER_ROWS,
  mosaicStateDigest,
  MOSAIC_NORMAL_RULES,
  replayMosaicRun,
} from '../src/index.js';

describe('MosaicSimulation', () => {
  it('spawns deterministically and applies one soft-drop edge before gravity', () => {
    const initial = createMosaicEngine(20260903, 4);
    const before = initial.active;
    if (before === null) throw new Error('New engine must spawn a tetromino.');

    expect(before.row).toBe(MOSAIC_BUFFER_ROWS - 1);

    const transition = advanceMosaicSimulation(
      initial,
      { ...emptyMosaicInput(), softDropPressed: true },
      MOSAIC_NORMAL_RULES,
    );

    expect(transition.state.active).toMatchObject({
      serial: before.serial,
      row: before.row + 1,
    });
    expect(transition.effects.map((effect) => effect.type)).toContain('piece-moved');
    expect(createMosaicEngine(20260903, 1).next).toBe(createMosaicEngine(20260903, 6).next);
  });

  it('handles immediate direction, DAS/ARR repetition and SOCD deterministically', () => {
    const rules = { ...MOSAIC_NORMAL_RULES, gravityIntervalTicks: 999, dasTicks: 2, arrTicks: 1 };
    const initial = createMosaicEngine(7);
    const initialColumn = initial.active?.column;
    if (initialColumn === undefined) throw new Error('New engine must spawn a tetromino.');

    const left = advanceMosaicSimulation(
      initial,
      { ...emptyMosaicInput(), leftPressed: true, leftHeld: true },
      rules,
    );
    const waiting = advanceMosaicSimulation(
      left.state,
      { ...emptyMosaicInput(), leftHeld: true },
      rules,
    );
    const repeating = advanceMosaicSimulation(
      waiting.state,
      { ...emptyMosaicInput(), leftHeld: true },
      rules,
    );
    const rightWins = advanceMosaicSimulation(
      repeating.state,
      { ...emptyMosaicInput(), leftHeld: true, rightPressed: true, rightHeld: true },
      rules,
    );

    expect(left.state.active?.column).toBe(initialColumn - 1);
    expect(waiting.state.active?.column).toBe(initialColumn - 1);
    expect(repeating.state.active?.column).toBe(initialColumn - 2);
    expect(rightWins.state.active?.column).toBe(initialColumn - 1);
  });

  it('replays the same mechanical frames to the same digest without presentation data', () => {
    const frames = [
      { ...emptyMosaicInput(), leftPressed: true, leftHeld: true },
      { ...emptyMosaicInput(), leftHeld: true },
      { ...emptyMosaicInput(), rotateCWPressed: true },
      { ...emptyMosaicInput(), softDropPressed: true },
    ];
    const replay = {
      engineVersion: 1 as const,
      inputEncodingVersion: 1 as const,
      runSeed: 99,
      materialSlotCount: 6,
      frames,
    };
    const first = replayMosaicRun(replay, MOSAIC_NORMAL_RULES);
    const second = replayMosaicRun(replay, MOSAIC_NORMAL_RULES);

    expect(mosaicStateDigest(first.state)).toBe(mosaicStateDigest(second.state));
  });

  it('emits lock-out only when all newly locked minos remain in the buffer', () => {
    const initial = createMosaicEngine(12);
    const board = createEmptyMosaicBoard();
    const cells = [...board.cells];
    cells[2 * board.columns + 1] = { materialSlot: 0, pieceSerial: 90 };
    cells[2 * board.columns + 2] = { materialSlot: 0, pieceSerial: 91 };
    const state = {
      ...initial,
      board: { ...board, cells },
      active: createActiveTetromino('O', 0, 0, 0, 0, 7),
      grounded: true,
      lockTicks: 0,
    };
    const transition = advanceMosaicSimulation(state, emptyMosaicInput(), {
      ...MOSAIC_NORMAL_RULES,
      gravityIntervalTicks: 999,
      lockDelayTicks: 1,
    });

    expect(transition.state.phase).toBe('top-out');
    expect(transition.effects).toContainEqual({ type: 'top-out', reason: 'lock-out' });
  });

  it('spawns in the same transition as a non-clearing lock when entry delay is zero', () => {
    const initial = createMosaicEngine(19);
    const state = {
      ...initial,
      active: createActiveTetromino('O', 0, 2, 16, 0, 1),
      grounded: true,
      lockTicks: 0,
    };
    const transition = advanceMosaicSimulation(state, emptyMosaicInput(), {
      ...MOSAIC_NORMAL_RULES,
      gravityIntervalTicks: 999,
      lockDelayTicks: 1,
      spawnDelayTicks: 0,
    });

    expect(transition.state).toMatchObject({
      active: { serial: initial.nextPieceSerial },
      phase: 'active',
      tick: initial.tick + 1,
    });
    expect(transition.effects.map((effect) => effect.type)).toEqual([
      'piece-locked',
      'piece-spawned',
    ]);
  });

  it('emits a single semantic ground contact without changing lock timing', () => {
    const initial = createMosaicEngine(31);
    const state = {
      ...initial,
      active: createActiveTetromino('O', 0, 2, 16, 0, 6),
      grounded: false,
      lockTicks: 0,
    };

    const transition = advanceMosaicSimulation(state, emptyMosaicInput(), {
      ...MOSAIC_NORMAL_RULES,
      gravityIntervalTicks: 999,
      lockDelayTicks: 2,
    });

    expect(transition.effects).toEqual([{ type: 'piece-grounded', serial: 6 }]);
    expect(transition.state).toMatchObject({ grounded: true, lockTicks: 1, phase: 'active' });
  });
});
