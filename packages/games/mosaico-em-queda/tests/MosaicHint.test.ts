import { describe, expect, it } from 'vitest';
import {
  createActiveTetromino,
  createEmptyMosaicBoard,
  createMosaicEngine,
  mosaicStateDigest,
  requestMosaicHint,
} from '../src/index.js';

describe('MosaicHint', () => {
  it('finds a reachable line clear without changing the engine or moving the piece', () => {
    const initial = createMosaicEngine(8);
    const board = createEmptyMosaicBoard();
    const cells = [...board.cells];
    for (let column = 0; column < 6; column += 1) {
      cells[17 * board.columns + column] = { materialSlot: 0, pieceSerial: 90 + column };
    }
    const state = {
      ...initial,
      board: { ...board, cells },
      active: createActiveTetromino('O', 0, 2, 1, 0, 44),
    };
    const digest = mosaicStateDigest(state);

    expect(requestMosaicHint(state)).toEqual({
      pieceSerial: 44,
      intent: 'right',
      target: { column: 5, row: 16, rotation: 0 },
    });
    expect(mosaicStateDigest(state)).toBe(digest);
  });
});
