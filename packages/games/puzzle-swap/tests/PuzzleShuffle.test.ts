import { SeededRandom } from '@christmas-games/platform';
import { describe, expect, it } from 'vitest';
import { createSolvedPuzzleBoard, isPuzzleSolved, shufflePuzzleBoard } from '../src/index.js';

describe('PuzzleShuffle', () => {
  it('replays the same shuffle from the same injected seed', () => {
    const board = createSolvedPuzzleBoard(3, 4);
    const first = shufflePuzzleBoard(board, new SeededRandom(4905));
    const second = shufflePuzzleBoard(board, new SeededRandom(4905));

    expect(first).toEqual(second);
    expect(first.moves).toBe(0);
    expect(isPuzzleSolved(first)).toBe(false);
  });

  it('repairs the identity permutation without claiming a player move', () => {
    const maxRandom = {
      next: () => 1,
      int: (_minimum: number, maximum: number) => maximum,
    };
    const shuffled = shufflePuzzleBoard(createSolvedPuzzleBoard(2, 2), maxRandom);

    expect(shuffled.pieces).toEqual([1, 0, 2, 3]);
    expect(shuffled.moves).toBe(0);
    expect(isPuzzleSolved(shuffled)).toBe(false);
  });
});
