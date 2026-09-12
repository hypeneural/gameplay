import { describe, expect, it } from 'vitest';
import {
  advanceMosaicSimulation,
  createEmptyMosaicBoard,
  createMosaicEngine,
  emptyMosaicInput,
  fitsTetromino,
  mosaicStateDigest,
  MOSAIC_NORMAL_RULES,
  replayMosaicRun,
} from '../src/index.js';

describe('Mosaico D2 conformance', () => {
  it('clears and spawns on the configured clear-delay tick when entry delay is zero', () => {
    const base = createMosaicEngine(4);
    const board = createEmptyMosaicBoard();
    const cells = [...board.cells];
    for (let column = 0; column < board.columns; column += 1) {
      cells[8 * board.columns + column] = { materialSlot: 0, pieceSerial: 42 };
    }
    const state = {
      ...base,
      board: { ...board, cells },
      active: null,
      phase: 'line-clear-delay' as const,
      pendingClearRows: [8],
      pendingLockSerial: 42,
      phaseTicks: MOSAIC_NORMAL_RULES.lineClearDelayTicks - 1,
    };

    const transition = advanceMosaicSimulation(state, emptyMosaicInput(), MOSAIC_NORMAL_RULES);

    expect(transition.state.phase).toBe('active');
    expect(transition.state.active?.serial).toBe(base.nextPieceSerial);
    expect(transition.effects.map((effect) => effect.type)).toEqual([
      'lines-cleared',
      'piece-spawned',
    ]);
  });

  it('keeps a mechanics digest independent of available photo-slot count', () => {
    const frames = Array.from({ length: 80 }, (_, index) => ({
      ...emptyMosaicInput(),
      rotateCWPressed: index % 17 === 0,
      softDropPressed: index % 5 === 0,
    }));
    const one = replayMosaicRun(
      { engineVersion: 1, inputEncodingVersion: 1, runSeed: 44, materialSlotCount: 1, frames },
      MOSAIC_NORMAL_RULES,
    );
    const six = replayMosaicRun(
      { engineVersion: 1, inputEncodingVersion: 1, runSeed: 44, materialSlotCount: 6, frames },
      MOSAIC_NORMAL_RULES,
    );

    expect(mosaicStateDigest(one.state)).toBe(mosaicStateDigest(six.state));
  });

  it('replays a deterministic 300-frame input sequence with stable checkpoints', () => {
    const frames = Array.from({ length: 300 }, (_, index) => ({
      ...emptyMosaicInput(),
      leftPressed: index % 41 === 0,
      leftHeld: index % 41 < 8,
      rightPressed: index % 53 === 0,
      rightHeld: index % 53 < 6,
      rotateCWPressed: index % 29 === 0,
      softDropPressed: index % 7 === 0,
    }));
    const replay = {
      engineVersion: 1 as const,
      inputEncodingVersion: 1 as const,
      runSeed: 77,
      materialSlotCount: 4,
      frames,
    };
    const first = replayMosaicRun(replay, MOSAIC_NORMAL_RULES, 100);
    const second = replayMosaicRun(replay, MOSAIC_NORMAL_RULES, 100);

    expect(first.checkpoints).toEqual(second.checkpoints);
    expect(first.checkpoints.map(({ tick }) => tick)).toEqual([100, 200, 300]);
  });

  it('keeps active pieces in bounds and lock resets capped across deterministic fuzz seeds', () => {
    for (let seed = 1; seed <= 16; seed += 1) {
      let state = createMosaicEngine(seed, (seed % 6) + 1);
      for (let tick = 0; tick < 180; tick += 1) {
        const frame = {
          ...emptyMosaicInput(),
          leftPressed: tick % 37 === 0,
          leftHeld: tick % 37 < 4,
          rightPressed: tick % 41 === 0,
          rightHeld: tick % 41 < 4,
          rotateCWPressed: tick % 23 === 0,
          softDropPressed: tick % 5 === 0,
        };
        state = advanceMosaicSimulation(state, frame, MOSAIC_NORMAL_RULES).state;
        if (state.active !== null) expect(fitsTetromino(state.board, state.active)).toBe(true);
        expect(state.lockResetCount).toBeLessThanOrEqual(MOSAIC_NORMAL_RULES.maxLockResets);
      }
    }
  });
});
