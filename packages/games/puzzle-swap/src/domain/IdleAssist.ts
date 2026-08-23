import type { Clock } from '@christmas-games/platform';
import type { PuzzleBoard, PuzzlePieceId } from './PuzzleBoard.js';

export interface IdleAssistState {
  readonly lastSuccessfulMoveAtMs: number;
  readonly hasShownSinceLastMove: boolean;
}

export interface PuzzleIdleHint {
  readonly kind: 'highlight-piece';
  readonly cellIndex: number;
  readonly pieceId: PuzzlePieceId;
}

export type IdleAssistResult =
  | { readonly state: IdleAssistState; readonly hint: null }
  | { readonly state: IdleAssistState; readonly hint: PuzzleIdleHint };

export function createIdleAssistState(clock: Clock): IdleAssistState {
  return { lastSuccessfulMoveAtMs: getClockTime(clock), hasShownSinceLastMove: false };
}

/** A successful swap resets the one gentle hint available for that pause. */
export function recordSuccessfulPuzzleMove(clock: Clock): IdleAssistState {
  return { lastSuccessfulMoveAtMs: getClockTime(clock), hasShownSinceLastMove: false };
}

/**
 * Returns a visual-only hint after the configured quiet interval. It never
 * changes the board or reveals a target cell, so it cannot solve a move.
 */
export function requestIdleAssist(
  board: PuzzleBoard,
  state: IdleAssistState,
  clock: Clock,
  idleDelayMs: number,
): IdleAssistResult {
  assertIdleDelay(idleDelayMs);
  const now = getClockTime(clock);

  if (state.hasShownSinceLastMove || now - state.lastSuccessfulMoveAtMs < idleDelayMs) {
    return { state, hint: null };
  }

  const cellIndex = board.pieces.findIndex((pieceId, index) => pieceId !== index);
  if (cellIndex === -1) {
    return { state: { ...state, hasShownSinceLastMove: true }, hint: null };
  }

  const pieceId = board.pieces[cellIndex];
  if (pieceId === undefined) {
    throw new Error('Puzzle idle assist found a missing piece.');
  }

  return {
    state: { ...state, hasShownSinceLastMove: true },
    hint: { kind: 'highlight-piece', cellIndex, pieceId },
  };
}

function getClockTime(clock: Clock): number {
  const now = clock.now();
  if (!Number.isFinite(now)) {
    throw new Error('Puzzle idle assist clock must return a finite time.');
  }
  return now;
}

function assertIdleDelay(idleDelayMs: number): void {
  if (!Number.isFinite(idleDelayMs) || idleDelayMs < 0) {
    throw new Error('Puzzle idle delay must be a non-negative finite value.');
  }
}
