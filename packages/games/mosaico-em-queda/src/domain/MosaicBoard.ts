import {
  MOSAIC_BUFFER_ROWS,
  MOSAIC_COLUMNS,
  MOSAIC_TOTAL_ROWS,
  MOSAIC_VISIBLE_ROWS,
  type ActiveTetromino,
  type MosaicBoard,
  type MosaicCell,
} from './EngineTypes.js';
import { tetrominoCells } from './TetrominoStates.js';

export function createEmptyMosaicBoard(): MosaicBoard {
  return {
    columns: MOSAIC_COLUMNS,
    visibleRows: MOSAIC_VISIBLE_ROWS,
    bufferRows: MOSAIC_BUFFER_ROWS,
    cells: Array<MosaicCell | null>(MOSAIC_COLUMNS * MOSAIC_TOTAL_ROWS).fill(null),
  };
}

export function createActiveTetromino(
  kind: ActiveTetromino['kind'],
  rotation: ActiveTetromino['rotation'],
  column: number,
  row: number,
  materialSlot: number,
  serial: number,
): ActiveTetromino {
  return { kind, rotation, column, row, materialSlot, serial };
}

export function fitsTetromino(board: MosaicBoard, tetromino: ActiveTetromino): boolean {
  return tetrominoCells(tetromino.kind, tetromino.rotation, tetromino.column, tetromino.row).every(
    ({ column, row }) =>
      column >= 0 &&
      column < board.columns &&
      row >= 0 &&
      row < totalRows(board) &&
      board.cells[cellIndex(board, column, row)] === null,
  );
}

export function lockTetromino(board: MosaicBoard, tetromino: ActiveTetromino): MosaicBoard {
  if (!fitsTetromino(board, tetromino)) {
    throw new Error('Cannot lock a tetromino that does not fit.');
  }

  const cells = [...board.cells];
  for (const { column, row } of tetrominoCells(
    tetromino.kind,
    tetromino.rotation,
    tetromino.column,
    tetromino.row,
  )) {
    cells[cellIndex(board, column, row)] = {
      materialSlot: tetromino.materialSlot,
      pieceSerial: tetromino.serial,
    };
  }
  return { ...board, cells };
}

export function findCompleteRows(board: MosaicBoard): readonly number[] {
  const rows: number[] = [];
  for (let row = 0; row < totalRows(board); row += 1) {
    if (isCompleteRow(board, row)) rows.push(row);
  }
  return rows;
}

export function clearCompleteRows(board: MosaicBoard, rows: readonly number[]): MosaicBoard {
  const clearRows = new Set(rows);
  const survivors: (MosaicCell | null)[] = [];
  for (let row = 0; row < totalRows(board); row += 1) {
    if (clearRows.has(row)) continue;
    survivors.push(...board.cells.slice(row * board.columns, (row + 1) * board.columns));
  }
  const blankCells = Array<MosaicCell | null>(clearRows.size * board.columns).fill(null);
  return { ...board, cells: [...blankCells, ...survivors] };
}

/** Structural operation shared by line clear and the ruleset's Workshop Relief. */
export function applyReliefRows(board: MosaicBoard, rows: readonly number[]): MosaicBoard {
  return clearCompleteRows(board, rows);
}

export function projectLanding(board: MosaicBoard, tetromino: ActiveTetromino): ActiveTetromino {
  let projection = tetromino;
  while (fitsTetromino(board, { ...projection, row: projection.row + 1 })) {
    projection = { ...projection, row: projection.row + 1 };
  }
  return projection;
}

function isCompleteRow(board: MosaicBoard, row: number): boolean {
  for (let column = 0; column < board.columns; column += 1) {
    if (board.cells[cellIndex(board, column, row)] === null) return false;
  }
  return true;
}

function cellIndex(board: MosaicBoard, column: number, row: number): number {
  return row * board.columns + column;
}

function totalRows(board: MosaicBoard): number {
  return board.visibleRows + board.bufferRows;
}
