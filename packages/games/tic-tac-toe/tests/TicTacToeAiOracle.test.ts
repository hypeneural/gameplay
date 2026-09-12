import { SeededRandom } from '@christmas-games/platform';
import { describe, expect, it } from 'vitest';
import {
  chooseSantaTicTacToeMove,
  type CellIndex,
  type CellOwner,
  type PlayerId,
  type TicTacToeBoard,
} from '../src/index.js';

const ORACLE_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

const ORACLE_EMPTY: TicTacToeBoard = [null, null, null, null, null, null, null, null, null];

interface ReachableState {
  readonly board: TicTacToeBoard;
  readonly turn: PlayerId;
}

function oracleOther(player: PlayerId): PlayerId {
  return player === 'player-a' ? 'player-b' : 'player-a';
}

function oracleLegalMoves(board: TicTacToeBoard): readonly CellIndex[] {
  const moves: CellIndex[] = [];
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] === null) moves.push(index as CellIndex);
  }
  return moves;
}

function oracleApply(board: TicTacToeBoard, player: PlayerId, move: CellIndex): TicTacToeBoard {
  const next = [...board];
  next[move] = player;
  return next as unknown as TicTacToeBoard;
}

function oracleWinner(board: TicTacToeBoard): PlayerId | null {
  for (const [first, second, third] of ORACLE_LINES) {
    const owner = board[first];
    if (owner !== null && owner === board[second] && owner === board[third]) return owner;
  }
  return null;
}

function oracleScore(
  board: TicTacToeBoard,
  turn: PlayerId,
  santa: PlayerId,
  depth: number,
): number {
  const winner = oracleWinner(board);
  const opponent = oracleOther(santa);
  if (winner === santa) return 100 - depth;
  if (winner === opponent) return -100 + depth;

  const legalMoves = oracleLegalMoves(board);
  if (legalMoves.length === 0) return 0;

  const scores = legalMoves.map((move) =>
    oracleScore(oracleApply(board, turn, move), oracleOther(turn), santa, depth + 1),
  );
  return turn === santa ? Math.max(...scores) : Math.min(...scores);
}

function oracleOptimalMoves(board: TicTacToeBoard, santa: PlayerId): readonly CellIndex[] {
  const opponent = oracleOther(santa);
  let bestScore = Number.NEGATIVE_INFINITY;
  let moves: CellIndex[] = [];
  for (const move of oracleLegalMoves(board)) {
    const score = oracleScore(oracleApply(board, santa, move), opponent, santa, 1);
    if (score > bestScore) {
      bestScore = score;
      moves = [move];
    } else if (score === bestScore) {
      moves.push(move);
    }
  }
  return moves;
}

function collectReachableStates(): readonly ReachableState[] {
  const states: ReachableState[] = [];
  const seen = new Set<string>();
  const visit = (board: TicTacToeBoard, turn: PlayerId): void => {
    const key = `${turn}:${board.map((owner) => owner ?? '-').join(',')}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (oracleWinner(board) !== null || oracleLegalMoves(board).length === 0) return;
    states.push({ board, turn });
    for (const move of oracleLegalMoves(board)) {
      visit(oracleApply(board, turn, move), oracleOther(turn));
    }
  };
  visit(ORACLE_EMPTY, 'player-a');
  return states;
}

const BOARD_TRANSFORMS = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8],
  [2, 5, 8, 1, 4, 7, 0, 3, 6],
  [8, 7, 6, 5, 4, 3, 2, 1, 0],
  [6, 3, 0, 7, 4, 1, 8, 5, 2],
  [2, 1, 0, 5, 4, 3, 8, 7, 6],
  [6, 7, 8, 3, 4, 5, 0, 1, 2],
  [0, 3, 6, 1, 4, 7, 2, 5, 8],
  [8, 5, 2, 7, 4, 1, 6, 3, 0],
] as const satisfies readonly (readonly CellIndex[])[];

function transformBoard(board: TicTacToeBoard, transform: readonly CellIndex[]): TicTacToeBoard {
  const transformed: CellOwner[] = [...ORACLE_EMPTY];
  for (let source = 0; source < board.length; source += 1) {
    transformed[transform[source]!] = board[source]!;
  }
  return transformed as unknown as TicTacToeBoard;
}

describe('Master AI independent oracle', () => {
  it('chooses an oracle-optimal move for every reachable non-terminal turn', () => {
    const states = collectReachableStates();
    expect(states.length).toBeGreaterThan(4_000);

    for (const { board, turn } of states) {
      const move = chooseSantaTicTacToeMove({
        board,
        difficulty: 'master',
        random: new SeededRandom(181),
        santa: turn,
      });
      expect(oracleOptimalMoves(board, turn)).toContain(move);
    }
  }, 20_000);

  it('keeps the Master move optimal across all eight board symmetries', () => {
    const position: TicTacToeBoard = [
      'player-b',
      'player-b',
      null,
      'player-a',
      'player-a',
      null,
      null,
      null,
      null,
    ];

    for (const transform of BOARD_TRANSFORMS) {
      const transformed = transformBoard(position, transform);
      const move = chooseSantaTicTacToeMove({
        board: transformed,
        difficulty: 'master',
        random: new SeededRandom(211),
      });
      expect(oracleOptimalMoves(transformed, 'player-b')).toContain(move);
      expect(move).toBe(transform[2]);
    }
  });
});
