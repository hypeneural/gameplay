import type { TicTacToeMatch } from '../domain/TicTacToeMatch.js';
import type { PlayerId } from '../domain/TicTacToeTypes.js';

export type TicTacToePresentationState =
  | 'mode'
  | 'difficulty'
  | 'photo-picker'
  | 'photo-loading'
  | 'board'
  | 'placing'
  | 'thinking'
  | 'round-result'
  | 'match-result';

export interface TicTacToeInputState {
  readonly paused: boolean;
  readonly presentation: TicTacToePresentationState;
}

/** Runtime-only guard for Zones; the domain remains the final acceptance gate. */
export function canPlaceTicTacToeCell(
  match: TicTacToeMatch | undefined,
  player: PlayerId,
  input: TicTacToeInputState,
): boolean {
  return (
    match !== undefined &&
    !input.paused &&
    input.presentation === 'board' &&
    match.phase === 'playing' &&
    match.turn === player
  );
}
