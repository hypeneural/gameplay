import { applyTicTacToeMove, findTicTacToeWinningLine, isTicTacToeDraw } from './TicTacToeRules.js';
import {
  EMPTY_TIC_TAC_TOE_BOARD,
  otherTicTacToePlayer,
  type CellIndex,
  type PlayerId,
  type RoundIndex,
  type TicTacToeBoard,
  type TicTacToeMode,
  type TicTacToeRoundPhase,
  type TicTacToeScore,
  type WinningLine,
} from './TicTacToeTypes.js';

export interface TicTacToeMatch {
  readonly mode: TicTacToeMode;
  readonly board: TicTacToeBoard;
  readonly turn: PlayerId;
  readonly starter: PlayerId;
  readonly roundIndex: RoundIndex;
  readonly score: TicTacToeScore;
  readonly phase: TicTacToeRoundPhase;
  readonly roundWinner: PlayerId | null;
  readonly winningLine: WinningLine | null;
  readonly matchWinner: PlayerId | null;
}

export interface CreateTicTacToeMatchInput {
  readonly mode: TicTacToeMode;
  readonly initialStarter: PlayerId;
}

export type TicTacToeMoveRejection = 'occupied' | 'wrong-turn' | 'not-playing' | 'round-finished';

export type TicTacToeMoveResult =
  | {
      readonly accepted: true;
      readonly state: TicTacToeMatch;
      readonly outcome: 'continue' | 'round-win' | 'round-draw' | 'match-complete';
    }
  | {
      readonly accepted: false;
      readonly state: TicTacToeMatch;
      readonly rejection: TicTacToeMoveRejection;
    };

const EMPTY_SCORE: TicTacToeScore = { playerA: 0, playerB: 0, draws: 0 };

export function createTicTacToeMatch({
  mode,
  initialStarter,
}: CreateTicTacToeMatchInput): TicTacToeMatch {
  return {
    mode,
    board: EMPTY_TIC_TAC_TOE_BOARD,
    turn: initialStarter,
    starter: initialStarter,
    roundIndex: 0,
    score: EMPTY_SCORE,
    phase: 'playing',
    roundWinner: null,
    winningLine: null,
    matchWinner: null,
  };
}

/** Applies one intent once. Rendering never needs to infer acceptance itself. */
export function playTicTacToeCell(
  match: TicTacToeMatch,
  player: PlayerId,
  cell: CellIndex,
): TicTacToeMoveResult {
  if (match.phase === 'match-complete') {
    return { accepted: false, state: match, rejection: 'not-playing' };
  }
  if (match.phase !== 'playing') {
    return { accepted: false, state: match, rejection: 'round-finished' };
  }
  if (match.turn !== player) {
    return { accepted: false, state: match, rejection: 'wrong-turn' };
  }
  if (match.board[cell] !== null) {
    return { accepted: false, state: match, rejection: 'occupied' };
  }

  const board = applyTicTacToeMove(match.board, player, cell);
  const winningLine = findTicTacToeWinningLine(board);
  if (winningLine !== null) {
    const score = incrementScore(match.score, player);
    const terminal = createTerminalMatch(match, board, player, winningLine, score);
    return {
      accepted: true,
      state: terminal,
      outcome: terminal.phase === 'match-complete' ? 'match-complete' : 'round-win',
    };
  }
  if (isTicTacToeDraw(board)) {
    const score: TicTacToeScore = { ...match.score, draws: match.score.draws + 1 };
    const terminal = createTerminalMatch(match, board, null, null, score);
    return {
      accepted: true,
      state: terminal,
      outcome: terminal.phase === 'match-complete' ? 'match-complete' : 'round-draw',
    };
  }

  return {
    accepted: true,
    outcome: 'continue',
    state: { ...match, board, turn: otherTicTacToePlayer(player) },
  };
}

/** Advances only a resolved, non-final round and preserves the match setup. */
export function startNextTicTacToeRound(match: TicTacToeMatch): TicTacToeMatch {
  if (match.phase !== 'round-complete') return match;
  const starter = otherTicTacToePlayer(match.starter);
  return {
    ...match,
    board: EMPTY_TIC_TAC_TOE_BOARD,
    turn: starter,
    starter,
    roundIndex: nextRoundIndex(match.roundIndex),
    phase: 'playing',
    roundWinner: null,
    winningLine: null,
  };
}

function incrementScore(score: TicTacToeScore, winner: PlayerId): TicTacToeScore {
  return winner === 'player-a'
    ? { ...score, playerA: score.playerA + 1 }
    : { ...score, playerB: score.playerB + 1 };
}

function createTerminalMatch(
  match: TicTacToeMatch,
  board: TicTacToeBoard,
  roundWinner: PlayerId | null,
  winningLine: WinningLine | null,
  score: TicTacToeScore,
): TicTacToeMatch {
  const matchComplete = score.playerA === 2 || score.playerB === 2 || match.roundIndex === 2;
  return {
    ...match,
    board,
    score,
    phase: matchComplete ? 'match-complete' : 'round-complete',
    roundWinner,
    winningLine,
    matchWinner: matchComplete ? scoreLeader(score) : null,
  };
}

function scoreLeader(score: TicTacToeScore): PlayerId | null {
  if (score.playerA === score.playerB) return null;
  return score.playerA > score.playerB ? 'player-a' : 'player-b';
}

function nextRoundIndex(roundIndex: RoundIndex): RoundIndex {
  return (roundIndex + 1) as RoundIndex;
}
