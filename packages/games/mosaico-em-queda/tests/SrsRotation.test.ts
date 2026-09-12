import { describe, expect, it } from 'vitest';
import {
  createActiveTetromino,
  createEmptyMosaicBoard,
  tryRotateClockwise,
  type MosaicBoard,
} from '../src/index.js';

describe('SRS clockwise rotation', () => {
  it('uses a floor kick rather than rotating through the floor', () => {
    const board = createEmptyMosaicBoard();
    const piece = createActiveTetromino('T', 0, 5, 16, 0, 1);

    expect(tryRotateClockwise(board, piece)).toMatchObject({
      rotation: 1,
      column: 4,
      row: 15,
    });
  });

  it('keeps an impossible rotation immutable', () => {
    const board = boardWithBlocks([
      [3, 2],
      [2, 2],
    ]);
    const piece = createActiveTetromino('T', 0, 2, 0, 0, 1);

    expect(tryRotateClockwise(board, piece)).toBeNull();
    expect(piece).toMatchObject({ kind: 'T', rotation: 0, column: 2, row: 0 });
  });

  it('keeps O at the same coordinates while advancing its canonical rotation', () => {
    const board = createEmptyMosaicBoard();
    const piece = createActiveTetromino('O', 0, 2, 1, 0, 1);

    expect(tryRotateClockwise(board, piece)).toEqual({ ...piece, rotation: 1 });
  });
});

function boardWithBlocks(points: readonly (readonly [number, number])[]): MosaicBoard {
  const board = createEmptyMosaicBoard();
  const cells = [...board.cells];
  for (const [column, row] of points) {
    cells[row * board.columns + column] = { materialSlot: 0, pieceSerial: 99 };
  }
  return { ...board, cells };
}
