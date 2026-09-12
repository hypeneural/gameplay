import type { CellIndex } from '../domain/TicTacToeTypes.js';

export const TIC_TAC_TOE_POINTER_SLOP_CSS_PX = 10;

export interface TicTacToeActivePointerPress {
  readonly cell: CellIndex;
  readonly epoch: number;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
}

export interface TicTacToePointerSample {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export function beginTicTacToePointerPress(
  cell: CellIndex,
  pointer: TicTacToePointerSample,
  epoch: number,
): TicTacToeActivePointerPress {
  return {
    cell,
    epoch,
    pointerId: pointer.id,
    startX: pointer.x,
    startY: pointer.y,
  };
}

export function exceedsTicTacToePointerSlop(
  press: TicTacToeActivePointerPress,
  pointer: TicTacToePointerSample,
  slopCssPx: number = TIC_TAC_TOE_POINTER_SLOP_CSS_PX,
): boolean {
  if (pointer.id !== press.pointerId) return false;
  const deltaX = pointer.x - press.startX;
  const deltaY = pointer.y - press.startY;
  return deltaX * deltaX + deltaY * deltaY > slopCssPx * slopCssPx;
}

export function canConfirmTicTacToePointerPress(
  press: TicTacToeActivePointerPress | undefined,
  pointer: TicTacToePointerSample,
  currentEpoch: number,
  releasedOverCell: CellIndex | undefined,
): boolean {
  return (
    press !== undefined &&
    press.pointerId === pointer.id &&
    press.epoch === currentEpoch &&
    press.cell === releasedOverCell &&
    !exceedsTicTacToePointerSlop(press, pointer)
  );
}
