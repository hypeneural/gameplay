import type { PuzzleBoard } from './PuzzleBoard.js';

/** A non-solving suggestion: swap the highlighted source piece into its home cell. */
export interface PuzzleHintSwap {
  /** The cell that is missing its own piece. */
  readonly targetCellIndex: number;
  /** The cell currently holding the piece needed by `targetCellIndex`. */
  readonly sourceCellIndex: number;
}

/**
 * Finds a useful two-piece hint without changing a board. The suggested swap
 * always puts one piece into its correct place, which makes the hint concrete
 * for a child without playing the move on their behalf.
 */
export function findPuzzleHintSwap(
  board: PuzzleBoard,
  preferredTargetCellIndex?: number,
): PuzzleHintSwap | null {
  const targetCellIndex = chooseTargetCell(board, preferredTargetCellIndex);
  if (targetCellIndex === null) return null;

  const sourceCellIndex = board.pieces.indexOf(targetCellIndex);
  if (sourceCellIndex < 0 || sourceCellIndex === targetCellIndex) {
    throw new Error('Puzzle hint could not find the required source piece.');
  }

  return { targetCellIndex, sourceCellIndex };
}

function chooseTargetCell(board: PuzzleBoard, preferredTargetCellIndex?: number): number | null {
  if (
    preferredTargetCellIndex !== undefined &&
    Number.isInteger(preferredTargetCellIndex) &&
    preferredTargetCellIndex >= 0 &&
    preferredTargetCellIndex < board.pieces.length &&
    board.pieces[preferredTargetCellIndex] !== preferredTargetCellIndex
  ) {
    return preferredTargetCellIndex;
  }

  const firstIncorrectCell = board.pieces.findIndex((pieceId, index) => pieceId !== index);
  return firstIncorrectCell === -1 ? null : firstIncorrectCell;
}
