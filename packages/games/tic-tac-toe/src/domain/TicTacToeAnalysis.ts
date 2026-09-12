import { applyTicTacToeMove, findTicTacToeWinner, legalTicTacToeMoves } from './TicTacToeRules.js';
import type { CellIndex, PlayerId, TicTacToeBoard } from './TicTacToeTypes.js';

/** Finds legal one-move wins from the supplied player's perspective. */
export function findImmediateTicTacToeWins(
  board: TicTacToeBoard,
  player: PlayerId,
): readonly CellIndex[] {
  if (findTicTacToeWinner(board) !== null) return [];
  return legalTicTacToeMoves(board).filter(
    (cell) => findTicTacToeWinner(applyTicTacToeMove(board, player, cell)) === player,
  );
}

/** A fork creates at least two different legal winning moves on the next turn. */
export function findTicTacToeForkMoves(
  board: TicTacToeBoard,
  player: PlayerId,
): readonly CellIndex[] {
  if (findTicTacToeWinner(board) !== null) return [];
  return legalTicTacToeMoves(board).filter((cell) => {
    const afterMove = applyTicTacToeMove(board, player, cell);
    return (
      findTicTacToeWinner(afterMove) === null &&
      findImmediateTicTacToeWins(afterMove, player).length >= 2
    );
  });
}
