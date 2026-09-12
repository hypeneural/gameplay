import { describe, expect, it } from 'vitest';
import {
  completeMosaicRecovery,
  createEmptyMosaicBoard,
  createMosaicProgress,
  planMosaicRecovery,
  resolveMosaicProgress,
} from '../src/index.js';

describe('Mosaic ruleset progress', () => {
  it('reaches the normal target and requests finite Workshop Relief without changing mechanics', () => {
    const progress = createMosaicProgress('normal');
    const reached = resolveMosaicProgress(progress, [
      { type: 'lines-cleared', rows: [5, 6, 7, 8] },
    ]);
    const recovery = resolveMosaicProgress(progress, [{ type: 'top-out', reason: 'block-out' }]);
    const board = createEmptyMosaicBoard();
    const cells = [...board.cells];
    cells[board.bufferRows * board.columns] = { materialSlot: 0, pieceSerial: 1 };
    cells[(board.bufferRows + 2) * board.columns] = { materialSlot: 0, pieceSerial: 2 };

    expect(reached.state.phase).toBe('completed');
    expect(reached.effects).toContainEqual({ type: 'target-reached' });
    expect(recovery.state.phase).toBe('recovering');
    expect(planMosaicRecovery({ ...board, cells }, 0)).toEqual({
      rows: [board.bufferRows, board.bufferRows + 2],
    });
    expect(completeMosaicRecovery(recovery.state)).toMatchObject({
      recoveryCount: 1,
      phase: 'playing',
    });
    expect(planMosaicRecovery({ ...board, cells }, 2)).toBeNull();
  });

  it('allows one Workshop Relief in challenge mode before ending gently', () => {
    const initial = createMosaicProgress('desafio');
    const firstTopOut = resolveMosaicProgress(initial, [{ type: 'top-out', reason: 'block-out' }]);
    const exhausted = resolveMosaicProgress(completeMosaicRecovery(firstTopOut.state), [
      { type: 'top-out', reason: 'lock-out' },
    ]);

    expect(firstTopOut.state.phase).toBe('recovering');
    expect(exhausted.state.phase).toBe('top-out');
    expect(exhausted.effects).toEqual([{ type: 'top-out-unrecovered' }]);
  });
});
