import { describe, expect, it } from 'vitest';
import {
  TETROMINO_KINDS,
  tetrominoCells,
  tetrominoOffsets,
  type TetrominoKind,
} from '../src/index.js';

describe('tetromino states', () => {
  it.each(TETROMINO_KINDS)('precomputes exactly four unique cells for %s', (kind) => {
    for (const rotation of [0, 1, 2, 3] as const) {
      const offsets = tetrominoOffsets(kind, rotation);
      const unique = new Set(offsets.map(({ column, row }) => `${column}:${row}`));

      expect(offsets).toHaveLength(4);
      expect(unique.size).toBe(4);
    }
  });

  it('keeps O invariant while other shapes expose their rotation cells', () => {
    expect(tetrominoOffsets('O', 0)).toEqual(tetrominoOffsets('O', 1));
    expect(tetrominoCells('T', 1, 3, 5)).toEqual([
      { column: 4, row: 5 },
      { column: 4, row: 6 },
      { column: 5, row: 6 },
      { column: 4, row: 7 },
    ]);
  });

  it.each(['I', 'J', 'L', 'S', 'T', 'Z'] as const satisfies readonly TetrominoKind[])(
    '%s has at least two distinct orientations',
    (kind) => {
      expect(tetrominoOffsets(kind, 0)).not.toEqual(tetrominoOffsets(kind, 1));
    },
  );
});
