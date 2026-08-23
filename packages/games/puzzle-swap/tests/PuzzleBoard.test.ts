import { describe, expect, it } from 'vitest';
import {
  createPuzzleBoard,
  createSolvedPuzzleBoard,
  getPuzzleProgress,
  isPuzzleSolved,
  swapPuzzlePieces,
} from '../src/index.js';

describe('PuzzleBoard', () => {
  it('models a rectangular solved board without relying on photo or renderer state', () => {
    const board = createSolvedPuzzleBoard(3, 4);

    expect(board).toEqual({
      columns: 3,
      rows: 4,
      pieces: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      moves: 0,
    });
    expect(isPuzzleSolved(board)).toBe(true);
  });

  it('applies any legal two-cell swap immutably and counts only successful moves', () => {
    const board = createSolvedPuzzleBoard(3, 2);
    const afterSwap = swapPuzzlePieces(board, { firstIndex: 0, secondIndex: 5 });

    expect(afterSwap).toEqual({
      columns: 3,
      rows: 2,
      pieces: [5, 1, 2, 3, 4, 0],
      moves: 1,
    });
    expect(board.pieces).toEqual([0, 1, 2, 3, 4, 5]);
    expect(isPuzzleSolved(afterSwap)).toBe(false);
    expect(swapPuzzlePieces(afterSwap, { firstIndex: 2, secondIndex: 2 })).toBe(afterSwap);
  });

  it('rejects a board whose pieces are not one complete permutation', () => {
    expect(() => createPuzzleBoard(2, 2, [0, 1, 1, 3])).toThrow('non-repeated permutation');
    expect(() => createPuzzleBoard(2, 2, [0, 1, 2])).toThrow('exactly 4 pieces');
  });

  it('derives accessible progress copy from pure board state', () => {
    const progress = getPuzzleProgress(createPuzzleBoard(2, 2, [0, 3, 2, 1], 4));

    expect(progress).toMatchObject({
      correctPieces: 2,
      totalPieces: 4,
      moves: 4,
      isSolved: false,
    });
    expect(progress.readableLabel).toBe('2 de 4 peças no lugar. 4 movimentos.');
  });
});
