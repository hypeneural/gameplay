import type { Random } from '@christmas-games/platform';
import { isPuzzleSolved, type PuzzleBoard } from './PuzzleBoard.js';

/**
 * Fisher-Yates with an injected source of entropy. A generated board is
 * guaranteed to require at least one swap, while preserving its move count.
 */
export function shufflePuzzleBoard(board: PuzzleBoard, random: Random): PuzzleBoard {
  if (board.pieces.length < 2) {
    return board;
  }

  const pieces = [...board.pieces];
  for (let currentIndex = pieces.length - 1; currentIndex > 0; currentIndex -= 1) {
    const nextIndex = random.int(0, currentIndex);
    const currentPiece = pieces[currentIndex];
    const nextPiece = pieces[nextIndex];

    if (currentPiece === undefined || nextPiece === undefined) {
      throw new Error('Puzzle shuffle received an incomplete board.');
    }

    pieces[currentIndex] = nextPiece;
    pieces[nextIndex] = currentPiece;
  }

  const shuffled = { ...board, pieces };
  if (!isPuzzleSolved(shuffled)) {
    return shuffled;
  }

  const firstPiece = pieces[0];
  const secondPiece = pieces[1];
  if (firstPiece === undefined || secondPiece === undefined) {
    throw new Error('Puzzle shuffle needs at least two pieces.');
  }

  pieces[0] = secondPiece;
  pieces[1] = firstPiece;
  return { ...board, pieces };
}
