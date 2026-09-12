import { describe, expect, it } from 'vitest';
import {
  clearCompleteRows,
  createActiveTetromino,
  createEmptyMosaicBoard,
  findCompleteRows,
  fitsTetromino,
  lockTetromino,
  projectLanding,
  type MosaicBoard,
} from '../src/index.js';

describe('MosaicBoard', () => {
  it('keeps a 8 × 18 board with four hidden buffer rows', () => {
    const board = createEmptyMosaicBoard();

    expect(board.columns).toBe(8);
    expect(board.visibleRows).toBe(14);
    expect(board.bufferRows).toBe(4);
    expect(board.cells).toHaveLength(8 * 18);
  });

  it('rejects a tetromino outside the board or against a locked cell', () => {
    const board = createEmptyMosaicBoard();
    const outside = createActiveTetromino('O', 0, -2, 0, 0, 1);
    const piece = createActiveTetromino('O', 0, 2, 0, 0, 2);
    const locked = lockTetromino(board, piece);

    expect(fitsTetromino(board, outside)).toBe(false);
    expect(fitsTetromino(locked, piece)).toBe(false);
    expect(board.cells.every((cell) => cell === null)).toBe(true);
  });

  it('locks immutably, clears non-adjacent complete rows together and preserves order', () => {
    const board = boardWithFilledRows([2, 4]);
    const marker = createActiveTetromino('O', 0, 0, 0, 3, 9);
    const locked = lockTetromino(board, marker);
    const rows = findCompleteRows(locked);
    const cleared = clearCompleteRows(locked, rows);

    expect(rows).toEqual([2, 4]);
    expect(board.cells[2 * 8]).not.toBeNull();
    expect(cleared.cells.slice(0, 16).every((cell) => cell === null)).toBe(true);
    expect(cleared.cells.some((cell) => cell?.pieceSerial === 9)).toBe(true);
  });

  it('projects a landing without storing it or mutating the active piece', () => {
    const board = createEmptyMosaicBoard();
    const piece = createActiveTetromino('T', 0, 2, 0, 1, 3);
    const projection = projectLanding(board, piece);

    expect(projection.row).toBeGreaterThan(piece.row);
    expect(piece.row).toBe(0);
    expect(fitsTetromino(board, projection)).toBe(true);
    expect(fitsTetromino(board, { ...projection, row: projection.row + 1 })).toBe(false);
  });
});

function boardWithFilledRows(rows: readonly number[]): MosaicBoard {
  const board = createEmptyMosaicBoard();
  const cells = [...board.cells];
  for (const row of rows) {
    for (let column = 0; column < board.columns; column += 1) {
      cells[row * board.columns + column] = { materialSlot: 0, pieceSerial: row * 10 + column };
    }
  }
  return { ...board, cells };
}
