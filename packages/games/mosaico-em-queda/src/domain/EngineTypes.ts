export const MOSAIC_COLUMNS = 8;
export const MOSAIC_VISIBLE_ROWS = 14;
export const MOSAIC_BUFFER_ROWS = 4;
export const MOSAIC_TOTAL_ROWS = MOSAIC_VISIBLE_ROWS + MOSAIC_BUFFER_ROWS;

export const TETROMINO_KINDS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;

export type TetrominoKind = (typeof TETROMINO_KINDS)[number];
export type Rotation = 0 | 1 | 2 | 3;

export interface MosaicCell {
  readonly materialSlot: number;
  readonly pieceSerial: number;
}

export interface MosaicBoard {
  readonly columns: number;
  readonly visibleRows: number;
  readonly bufferRows: number;
  readonly cells: readonly (MosaicCell | null)[];
}

export interface GridPoint {
  readonly column: number;
  readonly row: number;
}

export interface ActiveTetromino {
  readonly kind: TetrominoKind;
  readonly rotation: Rotation;
  readonly column: number;
  readonly row: number;
  readonly materialSlot: number;
  readonly serial: number;
}

export interface MosaicRandom {
  readonly state: number;
}

export type MosaicEnginePhase = 'active' | 'line-clear-delay' | 'entry-delay' | 'top-out';
export type HorizontalDirection = 'left' | 'right';

export interface MosaicRules {
  readonly gravityIntervalTicks: number;
  readonly lockDelayTicks: number;
  readonly maxLockResets: number;
  readonly lineClearDelayTicks: number;
  readonly spawnDelayTicks: number;
  readonly dasTicks: number;
  readonly arrTicks: number;
}

export interface MosaicInputFrame {
  readonly leftPressed: boolean;
  readonly leftHeld: boolean;
  readonly rightPressed: boolean;
  readonly rightHeld: boolean;
  readonly rotateCWPressed: boolean;
  readonly softDropPressed: boolean;
}

export interface MosaicEngineState {
  readonly board: MosaicBoard;
  readonly active: ActiveTetromino | null;
  readonly next: TetrominoKind;
  readonly bag: readonly TetrominoKind[];
  readonly pieceRandom: MosaicRandom;
  readonly materialRandom: MosaicRandom;
  readonly phase: MosaicEnginePhase;
  readonly grounded: boolean;
  readonly pendingClearRows: readonly number[];
  readonly pendingLockSerial: number | null;
  readonly phaseTicks: number;
  readonly tick: number;
  readonly gravityTicks: number;
  readonly lockTicks: number;
  readonly lockResetCount: number;
  readonly lastHorizontalPress: HorizontalDirection | null;
  readonly horizontalHoldTicks: number;
  readonly nextPieceSerial: number;
  readonly materialSlotCount: number;
}

export type MosaicEffect =
  | { readonly type: 'piece-moved'; readonly serial: number }
  | { readonly type: 'piece-rotated'; readonly serial: number }
  | { readonly type: 'piece-grounded'; readonly serial: number }
  | { readonly type: 'piece-locked'; readonly serial: number }
  | { readonly type: 'lines-detected'; readonly rows: readonly number[] }
  | { readonly type: 'lines-cleared'; readonly rows: readonly number[] }
  | { readonly type: 'piece-spawned'; readonly serial: number }
  | { readonly type: 'top-out'; readonly reason: 'block-out' | 'lock-out' };

export interface MosaicTransition {
  readonly state: MosaicEngineState;
  readonly effects: readonly MosaicEffect[];
}
