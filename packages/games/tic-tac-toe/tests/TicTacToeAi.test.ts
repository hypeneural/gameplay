import { SeededRandom, type Random } from '@christmas-games/platform';
import { describe, expect, it } from 'vitest';
import {
  applyTicTacToeMove,
  chooseSantaTicTacToeMove,
  EMPTY_TIC_TAC_TOE_BOARD,
  findTicTacToeWinner,
  legalTicTacToeMoves,
  otherTicTacToePlayer,
  type PlayerId,
  type TicTacToeBoard,
} from '../src/index.js';

const INDEPENDENT_WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

class SequenceRandom implements Random {
  private cursor = 0;

  constructor(private readonly values: readonly number[]) {}

  next(): number {
    const value = this.values[this.cursor] ?? 0;
    this.cursor += 1;
    return value;
  }

  int(minInclusive: number, maxInclusive: number): number {
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
  }
}

function board(cells: readonly (PlayerId | null)[]): TicTacToeBoard {
  return cells as TicTacToeBoard;
}

function independentWinner(position: TicTacToeBoard): PlayerId | null {
  for (const [first, second, third] of INDEPENDENT_WIN_LINES) {
    const owner = position[first];
    if (owner !== null && owner === position[second] && owner === position[third]) return owner;
  }
  return null;
}

/** A small independent game-tree oracle checks that a human cannot force a win. */
function humanCanForceWinAgainstMaster(position: TicTacToeBoard, turn: PlayerId): boolean {
  const winner = independentWinner(position);
  if (winner === 'player-a') return true;
  if (winner === 'player-b' || legalTicTacToeMoves(position).length === 0) return false;

  if (turn === 'player-a') {
    return legalTicTacToeMoves(position).some((move) =>
      humanCanForceWinAgainstMaster(applyTicTacToeMove(position, 'player-a', move), 'player-b'),
    );
  }

  const move = chooseSantaTicTacToeMove({
    board: position,
    difficulty: 'master',
    random: new SeededRandom(71),
  });
  if (move === null) return false;
  return humanCanForceWinAgainstMaster(applyTicTacToeMove(position, 'player-b', move), 'player-a');
}

describe('Santa AI', () => {
  it('makes Easy take an immediate win even when its injected random is high', () => {
    const position = board([
      'player-b',
      'player-b',
      null,
      'player-a',
      'player-a',
      null,
      null,
      null,
      null,
    ]);
    const random = new SequenceRandom([0.9]);
    const move = chooseSantaTicTacToeMove({ board: position, difficulty: 'easy', random });

    expect(legalTicTacToeMoves(position)).toContain(move);
    expect(move).toBe(2);
  });

  it('lets Easy occasionally skip a block, while still keeping a legal weighted move', () => {
    const position = board([
      'player-a',
      'player-a',
      null,
      null,
      'player-b',
      null,
      null,
      null,
      null,
    ]);
    const random = new SequenceRandom([0.99, 0.99]);
    const move = chooseSantaTicTacToeMove({ board: position, difficulty: 'easy', random });

    expect(move).toBe(8);
  });

  it('makes Smart create and block forks before positional preferences', () => {
    const ownFork = board(['player-b', null, null, null, 'player-a', null, null, null, 'player-b']);
    const opponentFork = board([
      'player-b',
      'player-a',
      'player-a',
      null,
      null,
      null,
      null,
      null,
      null,
    ]);

    expect(
      chooseSantaTicTacToeMove({
        board: ownFork,
        difficulty: 'smart',
        random: new SeededRandom(8),
      }),
    ).toBeOneOf([2, 6]);
    expect(
      chooseSantaTicTacToeMove({
        board: opponentFork,
        difficulty: 'smart',
        random: new SeededRandom(8),
      }),
    ).toBe(4);
  });

  it('makes Smart answer a double fork with a forcing side threat', () => {
    const doubleFork = board([
      'player-a',
      null,
      null,
      null,
      'player-b',
      null,
      null,
      null,
      'player-a',
    ]);

    expect(
      chooseSantaTicTacToeMove({
        board: doubleFork,
        difficulty: 'smart',
        random: new SeededRandom(14),
      }),
    ).toBeOneOf([1, 3, 5, 7]);
  });

  it('makes Master take an immediate win and use a seeded tie-break', () => {
    const position = board([
      'player-b',
      'player-b',
      null,
      'player-a',
      'player-a',
      null,
      null,
      null,
      null,
    ]);
    const first = chooseSantaTicTacToeMove({
      board: position,
      difficulty: 'master',
      random: new SeededRandom(73),
    });
    const second = chooseSantaTicTacToeMove({
      board: position,
      difficulty: 'master',
      random: new SeededRandom(73),
    });

    expect(first).toBe(2);
    expect(second).toBe(first);
  });

  it('has Master versus Master draw from an empty board', () => {
    let state = EMPTY_TIC_TAC_TOE_BOARD;
    let player: PlayerId = 'player-a';
    const random = new SeededRandom(21);

    while (legalTicTacToeMoves(state).length > 0 && findTicTacToeWinner(state) === null) {
      const move = chooseSantaTicTacToeMove({
        board: state,
        difficulty: 'master',
        random,
        santa: player,
      });
      expect(move).not.toBeNull();
      state = applyTicTacToeMove(state, player, move!);
      player = otherTicTacToePlayer(player);
    }

    expect(findTicTacToeWinner(state)).toBeNull();
  });

  it('does not allow a human opening move to force a Master loss', () => {
    expect(humanCanForceWinAgainstMaster(EMPTY_TIC_TAC_TOE_BOARD, 'player-a')).toBe(false);
  });
});
