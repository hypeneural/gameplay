import { describe, expect, it } from 'vitest';
import {
  applyMosaicWorkshopRelief,
  createEmptyMosaicBoard,
  createMosaicExperience,
  resolveMosaicExperience,
} from '../src/index.js';

describe('MosaicExperience', () => {
  it('opens zero, one or two visible rows without consuming mechanics state and ends gently at the cap', () => {
    const base = createMosaicExperience('normal', 5);
    const board = createEmptyMosaicBoard();
    const cells = [...board.cells];
    cells[board.bufferRows * board.columns] = { materialSlot: 0, pieceSerial: 20 };
    cells[(board.bufferRows + 2) * board.columns] = { materialSlot: 0, pieceSerial: 21 };
    const recoverable = resolveMosaicExperience(
      {
        ...base,
        engine: { ...base.engine, board: { ...board, cells }, active: null, phase: 'top-out' },
      },
      [{ type: 'top-out', reason: 'block-out' }],
    );
    const relieved = applyMosaicWorkshopRelief(recoverable.state);
    const bufferOnly = resolveMosaicExperience(
      { ...base, engine: { ...base.engine, active: null, phase: 'top-out' } },
      [{ type: 'top-out', reason: 'block-out' }],
    );
    const oneRow = resolveMosaicExperience(
      {
        ...base,
        engine: {
          ...base.engine,
          board: {
            ...board,
            cells: cells.map((cell, index) =>
              index === board.bufferRows * board.columns ? cell : null,
            ),
          },
          active: null,
          phase: 'top-out',
        },
      },
      [{ type: 'top-out', reason: 'block-out' }],
    );
    const exhausted = resolveMosaicExperience(
      {
        ...recoverable.state,
        progress: { ...recoverable.state.progress, recoveryCount: 2, phase: 'playing' },
      },
      [{ type: 'top-out', reason: 'block-out' }],
    );

    expect(recoverable.state.progress.phase).toBe('recovering');
    expect(relieved.effects[0]).toEqual({
      type: 'rows-relieved',
      rows: [board.bufferRows, board.bufferRows + 2],
    });
    expect(relieved.state.progress).toMatchObject({ recoveryCount: 1, phase: 'playing' });
    expect(relieved.state.engine).toMatchObject({
      phase: 'entry-delay',
      bag: recoverable.state.engine.bag,
      next: recoverable.state.engine.next,
      pieceRandom: recoverable.state.engine.pieceRandom,
      materialRandom: recoverable.state.engine.materialRandom,
    });
    expect(bufferOnly.state.progress.phase).toBe('top-out');
    expect(bufferOnly.effects).toContainEqual({ type: 'top-out-unrecovered' });
    expect(applyMosaicWorkshopRelief(oneRow.state).effects[0]).toEqual({
      type: 'rows-relieved',
      rows: [board.bufferRows],
    });
    expect(exhausted.state.progress.phase).toBe('top-out');
  });
});
