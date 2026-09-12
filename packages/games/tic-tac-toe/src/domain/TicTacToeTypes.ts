export const CELL_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

export type CellIndex = (typeof CELL_INDEXES)[number];
export type PlayerId = 'player-a' | 'player-b';
export type CellOwner = PlayerId | null;
export type TicTacToeMode = 'santa' | 'local';
export type SantaDifficulty = 'easy' | 'smart' | 'master';
export type TicTacToeRoundPhase = 'playing' | 'round-complete' | 'match-complete';
export type RoundIndex = 0 | 1 | 2;

/** The tuple is the canonical truth; presentation never owns a second board. */
export type TicTacToeBoard = readonly [
  CellOwner,
  CellOwner,
  CellOwner,
  CellOwner,
  CellOwner,
  CellOwner,
  CellOwner,
  CellOwner,
  CellOwner,
];

export type WinningLine = readonly [CellIndex, CellIndex, CellIndex];

export const EMPTY_TIC_TAC_TOE_BOARD: TicTacToeBoard = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

/** Safe metadata only; runtime maps the id back to an already-authorized photo. */
export interface TicTacToePhotoDescriptor {
  readonly id: string;
  readonly orientation: 'portrait' | 'landscape' | 'square';
  readonly aspectRatio: number;
}

export interface TicTacToeScore {
  readonly playerA: number;
  readonly playerB: number;
  readonly draws: number;
}

export function otherTicTacToePlayer(player: PlayerId): PlayerId {
  return player === 'player-a' ? 'player-b' : 'player-a';
}
