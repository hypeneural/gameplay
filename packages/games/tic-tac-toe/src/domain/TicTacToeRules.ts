import {
  CELL_INDEXES,
  type CellIndex,
  type PlayerId,
  type TicTacToeBoard,
  type WinningLine,
} from './TicTacToeTypes.js';

export const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const satisfies readonly WinningLine[];

export function legalTicTacToeMoves(board: TicTacToeBoard): readonly CellIndex[] {
  return CELL_INDEXES.filter((cell) => board[cell] === null);
}

export function isLegalTicTacToeMove(board: TicTacToeBoard, cell: CellIndex): boolean {
  return board[cell] === null;
}

/** Returns a new board and never mutates the incoming canonical tuple. */
export function applyTicTacToeMove(
  board: TicTacToeBoard,
  player: PlayerId,
  cell: CellIndex,
): TicTacToeBoard {
  if (!isLegalTicTacToeMove(board, cell)) {
    throw new Error(`Tic-Tac-Toe cell ${cell} is already occupied.`);
  }
  const nextBoard = [...board] as [
    TicTacToeBoard[0],
    TicTacToeBoard[1],
    TicTacToeBoard[2],
    TicTacToeBoard[3],
    TicTacToeBoard[4],
    TicTacToeBoard[5],
    TicTacToeBoard[6],
    TicTacToeBoard[7],
    TicTacToeBoard[8],
  ];
  nextBoard[cell] = player;
  return nextBoard;
}

export function findTicTacToeWinningLine(board: TicTacToeBoard): WinningLine | null {
  for (const line of WIN_LINES) {
    const [first, second, third] = line;
    const owner = board[first];
    if (owner !== null && owner === board[second] && owner === board[third]) {
      return line;
    }
  }
  return null;
}

export function findTicTacToeWinner(board: TicTacToeBoard): PlayerId | null {
  const line = findTicTacToeWinningLine(board);
  return line === null ? null : board[line[0]];
}

export function isTicTacToeDraw(board: TicTacToeBoard): boolean {
  return findTicTacToeWinner(board) === null && legalTicTacToeMoves(board).length === 0;
}

export function isTicTacToeTerminal(board: TicTacToeBoard): boolean {
  return findTicTacToeWinner(board) !== null || isTicTacToeDraw(board);
}
