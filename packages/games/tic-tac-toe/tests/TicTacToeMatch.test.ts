import { describe, expect, it } from 'vitest';
import {
  createTicTacToeMatch,
  EMPTY_TIC_TAC_TOE_BOARD,
  playTicTacToeCell,
  startNextTicTacToeRound,
  type CellIndex,
  type PlayerId,
  type TicTacToeMatch,
} from '../src/index.js';

function playSequence(match: TicTacToeMatch, cells: readonly CellIndex[]): TicTacToeMatch {
  let state = match;
  for (const cell of cells) {
    const player: PlayerId = state.turn;
    const result = playTicTacToeCell(state, player, cell);
    if (!result.accepted) throw new Error(`Expected cell ${cell} to be accepted.`);
    state = result.state;
  }
  return state;
}

describe('Tic-Tac-Toe best-of-three match', () => {
  it('accepts one intent, then refuses duplicate and out-of-turn input', () => {
    const match = createTicTacToeMatch({ mode: 'santa', initialStarter: 'player-a' });
    const first = playTicTacToeCell(match, 'player-a', 4);

    expect(first).toMatchObject({ accepted: true, outcome: 'continue' });
    if (!first.accepted) return;
    expect(playTicTacToeCell(first.state, 'player-b', 4)).toMatchObject({
      accepted: false,
      rejection: 'occupied',
    });
    expect(playTicTacToeCell(first.state, 'player-a', 0)).toMatchObject({
      accepted: false,
      rejection: 'wrong-turn',
    });
  });

  it('alternates starter, preserves score, and completes early at two round wins', () => {
    let match = createTicTacToeMatch({ mode: 'santa', initialStarter: 'player-a' });
    match = playSequence(match, [0, 3, 1, 4, 2]);
    expect(match).toMatchObject({
      phase: 'round-complete',
      roundWinner: 'player-a',
      score: { playerA: 1, playerB: 0, draws: 0 },
    });

    match = startNextTicTacToeRound(match);
    expect(match).toMatchObject({
      roundIndex: 1,
      starter: 'player-b',
      turn: 'player-b',
      board: EMPTY_TIC_TAC_TOE_BOARD,
    });

    match = playSequence(match, [0, 3, 1, 4, 2]);
    expect(match.score).toEqual({ playerA: 1, playerB: 1, draws: 0 });

    match = startNextTicTacToeRound(match);
    match = playSequence(match, [0, 3, 1, 4, 2]);
    expect(match).toMatchObject({
      phase: 'match-complete',
      roundWinner: 'player-a',
      matchWinner: 'player-a',
      score: { playerA: 2, playerB: 1, draws: 0 },
    });
    expect(playTicTacToeCell(match, 'player-b', 8)).toMatchObject({
      accepted: false,
      rejection: 'not-playing',
    });
  });

  it('counts a draw once and lets it consume a round', () => {
    let match = createTicTacToeMatch({ mode: 'local', initialStarter: 'player-a' });
    match = playSequence(match, [0, 1, 2, 4, 3, 5, 7, 6, 8]);

    expect(match).toMatchObject({
      phase: 'round-complete',
      roundWinner: null,
      winningLine: null,
      score: { playerA: 0, playerB: 0, draws: 1 },
    });
    expect(startNextTicTacToeRound(match).score.draws).toBe(1);
  });
});
