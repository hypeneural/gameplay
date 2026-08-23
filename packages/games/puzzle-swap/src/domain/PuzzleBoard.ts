export type PuzzlePieceId = number;

export interface PuzzleBoard {
  readonly columns: number;
  readonly rows: number;
  /** A cell stores the id of the piece currently occupying it. */
  readonly pieces: readonly PuzzlePieceId[];
  /** Only successful player swaps increment this counter. */
  readonly moves: number;
}

export interface PuzzleSwap {
  readonly firstIndex: number;
  readonly secondIndex: number;
}

export function createSolvedPuzzleBoard(columns: number, rows: number): PuzzleBoard {
  assertGridDimensions(columns, rows);
  const pieceCount = columns * rows;

  return createPuzzleBoard(
    columns,
    rows,
    Array.from({ length: pieceCount }, (_value, index) => index),
  );
}

/**
 * Rehydrates a board from a persisted or generated permutation. Piece ids are
 * always the solved cell indexes, so completion never depends on image data.
 */
export function createPuzzleBoard(
  columns: number,
  rows: number,
  pieces: readonly PuzzlePieceId[],
  moves = 0,
): PuzzleBoard {
  assertGridDimensions(columns, rows);
  assertMoveCount(moves);

  const pieceCount = columns * rows;
  if (pieces.length !== pieceCount) {
    throw new Error(`Puzzle board needs exactly ${pieceCount} pieces.`);
  }

  const expectedPieces = new Set<number>();
  for (let index = 0; index < pieceCount; index += 1) {
    expectedPieces.add(index);
  }

  for (const piece of pieces) {
    if (!Number.isInteger(piece) || !expectedPieces.delete(piece)) {
      throw new Error('Puzzle pieces must be one complete, non-repeated permutation.');
    }
  }

  return { columns, rows, pieces: [...pieces], moves };
}

export function isPuzzleSolved(board: PuzzleBoard): boolean {
  return board.pieces.every((pieceId, index) => pieceId === index);
}

export function isPuzzleCellIndex(board: PuzzleBoard, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < board.pieces.length;
}

export function swapPuzzlePieces(board: PuzzleBoard, swap: PuzzleSwap): PuzzleBoard {
  assertPuzzleCellIndex(board, swap.firstIndex);
  assertPuzzleCellIndex(board, swap.secondIndex);

  if (swap.firstIndex === swap.secondIndex) {
    return board;
  }

  const pieces = [...board.pieces];
  const firstPiece = pieces[swap.firstIndex];
  const secondPiece = pieces[swap.secondIndex];

  if (firstPiece === undefined || secondPiece === undefined) {
    throw new Error('Puzzle board is missing a piece at a valid cell index.');
  }

  pieces[swap.firstIndex] = secondPiece;
  pieces[swap.secondIndex] = firstPiece;

  return { ...board, pieces, moves: board.moves + 1 };
}

export function assertPuzzleCellIndex(board: PuzzleBoard, index: number): void {
  if (!isPuzzleCellIndex(board, index)) {
    throw new Error(`Puzzle cell index ${index} is outside this board.`);
  }
}

function assertGridDimensions(columns: number, rows: number): void {
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1) {
    throw new Error('Puzzle grid dimensions must be positive integers.');
  }
}

function assertMoveCount(moves: number): void {
  if (!Number.isInteger(moves) || moves < 0) {
    throw new Error('Puzzle move count must be a non-negative integer.');
  }
}
