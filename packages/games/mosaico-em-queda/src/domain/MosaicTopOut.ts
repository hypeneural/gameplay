import type { MosaicBoard } from './EngineTypes.js';

/** A lock-out occurs only when all four newly locked minos remain in the hidden buffer. */
export function isMosaicLockOut(board: MosaicBoard, pieceSerial: number): boolean {
  let count = 0;
  for (let row = 0; row < board.bufferRows; row += 1) {
    for (let column = 0; column < board.columns; column += 1) {
      if (board.cells[row * board.columns + column]?.pieceSerial === pieceSerial) count += 1;
    }
  }
  return count === 4;
}
