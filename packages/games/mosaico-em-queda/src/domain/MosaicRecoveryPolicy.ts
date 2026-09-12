import type { MosaicBoard } from './EngineTypes.js';

export interface MosaicRecoveryPlan {
  readonly rows: readonly number[];
}

/** Selects at most two occupied visible rows; it never mutates the board or consumes RNG. */
export function planMosaicRecovery(
  board: MosaicBoard,
  recoveryCount: number,
): MosaicRecoveryPlan | null {
  if (recoveryCount >= 2) return null;
  const rows: number[] = [];
  const firstVisibleRow = board.bufferRows;
  const finalRow = board.bufferRows + board.visibleRows;
  for (let row = firstVisibleRow; row < finalRow && rows.length < 2; row += 1) {
    const occupied = board.cells
      .slice(row * board.columns, (row + 1) * board.columns)
      .some(Boolean);
    if (occupied) rows.push(row);
  }
  return rows.length === 0 ? null : { rows };
}
