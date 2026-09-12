import type { GridPoint, Rotation, TetrominoKind } from './EngineTypes.js';

const STATE_OFFSETS: Readonly<Record<TetrominoKind, readonly (readonly GridPoint[])[]>> = {
  I: [
    [
      { column: 0, row: 1 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 3, row: 1 },
    ],
    [
      { column: 2, row: 0 },
      { column: 2, row: 1 },
      { column: 2, row: 2 },
      { column: 2, row: 3 },
    ],
    [
      { column: 0, row: 2 },
      { column: 1, row: 2 },
      { column: 2, row: 2 },
      { column: 3, row: 2 },
    ],
    [
      { column: 1, row: 0 },
      { column: 1, row: 1 },
      { column: 1, row: 2 },
      { column: 1, row: 3 },
    ],
  ],
  O: [
    [
      { column: 1, row: 0 },
      { column: 2, row: 0 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
    ],
    [
      { column: 1, row: 0 },
      { column: 2, row: 0 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
    ],
    [
      { column: 1, row: 0 },
      { column: 2, row: 0 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
    ],
    [
      { column: 1, row: 0 },
      { column: 2, row: 0 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
    ],
  ],
  T: [
    [
      { column: 1, row: 0 },
      { column: 0, row: 1 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
    ],
    [
      { column: 1, row: 0 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 1, row: 2 },
    ],
    [
      { column: 0, row: 1 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 1, row: 2 },
    ],
    [
      { column: 1, row: 0 },
      { column: 0, row: 1 },
      { column: 1, row: 1 },
      { column: 1, row: 2 },
    ],
  ],
  S: [
    [
      { column: 1, row: 0 },
      { column: 2, row: 0 },
      { column: 0, row: 1 },
      { column: 1, row: 1 },
    ],
    [
      { column: 1, row: 0 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 2, row: 2 },
    ],
    [
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 0, row: 2 },
      { column: 1, row: 2 },
    ],
    [
      { column: 0, row: 0 },
      { column: 0, row: 1 },
      { column: 1, row: 1 },
      { column: 1, row: 2 },
    ],
  ],
  Z: [
    [
      { column: 0, row: 0 },
      { column: 1, row: 0 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
    ],
    [
      { column: 2, row: 0 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 1, row: 2 },
    ],
    [
      { column: 0, row: 1 },
      { column: 1, row: 1 },
      { column: 1, row: 2 },
      { column: 2, row: 2 },
    ],
    [
      { column: 1, row: 0 },
      { column: 0, row: 1 },
      { column: 1, row: 1 },
      { column: 0, row: 2 },
    ],
  ],
  J: [
    [
      { column: 0, row: 0 },
      { column: 0, row: 1 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
    ],
    [
      { column: 1, row: 0 },
      { column: 2, row: 0 },
      { column: 1, row: 1 },
      { column: 1, row: 2 },
    ],
    [
      { column: 0, row: 1 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 2, row: 2 },
    ],
    [
      { column: 1, row: 0 },
      { column: 1, row: 1 },
      { column: 0, row: 2 },
      { column: 1, row: 2 },
    ],
  ],
  L: [
    [
      { column: 2, row: 0 },
      { column: 0, row: 1 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
    ],
    [
      { column: 1, row: 0 },
      { column: 1, row: 1 },
      { column: 1, row: 2 },
      { column: 2, row: 2 },
    ],
    [
      { column: 0, row: 1 },
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 0, row: 2 },
    ],
    [
      { column: 0, row: 0 },
      { column: 1, row: 0 },
      { column: 1, row: 1 },
      { column: 1, row: 2 },
    ],
  ],
};

export function tetrominoOffsets(kind: TetrominoKind, rotation: Rotation): readonly GridPoint[] {
  const offsets = STATE_OFFSETS[kind][rotation];
  if (offsets === undefined) {
    throw new Error(`Missing precomputed state for ${kind} rotation ${rotation}.`);
  }
  return offsets;
}

export function tetrominoCells(
  kind: TetrominoKind,
  rotation: Rotation,
  column: number,
  row: number,
): readonly GridPoint[] {
  return tetrominoOffsets(kind, rotation).map((offset) => ({
    column: column + offset.column,
    row: row + offset.row,
  }));
}
