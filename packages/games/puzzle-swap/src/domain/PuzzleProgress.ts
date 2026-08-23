import { isPuzzleSolved, type PuzzleBoard } from './PuzzleBoard.js';

export interface PuzzleProgress {
  readonly correctPieces: number;
  readonly totalPieces: number;
  readonly moves: number;
  readonly isSolved: boolean;
  /** Copy intended for an aria-live status region and the visible HUD. */
  readonly readableLabel: string;
}

export function getPuzzleProgress(board: PuzzleBoard): PuzzleProgress {
  const correctPieces = board.pieces.filter((pieceId, index) => pieceId === index).length;
  const totalPieces = board.pieces.length;
  const solved = isPuzzleSolved(board);

  return {
    correctPieces,
    totalPieces,
    moves: board.moves,
    isSolved: solved,
    readableLabel: solved
      ? `Quebra-cabeça completo em ${board.moves} movimentos.`
      : `${correctPieces} de ${totalPieces} peças no lugar. ${board.moves} movimentos.`,
  };
}
