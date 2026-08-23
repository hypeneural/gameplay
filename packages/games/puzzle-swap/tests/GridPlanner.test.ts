import { describe, expect, it } from 'vitest';
import { planPuzzleGrid } from '../src/index.js';

const candidates = [
  { columns: 3, rows: 4 },
  { columns: 4, rows: 3 },
  { columns: 4, rows: 5 },
  { columns: 5, rows: 4 },
];

describe('GridPlanner', () => {
  it('chooses a portrait-oriented 3×4 grid while preserving the photo aspect ratio', () => {
    const plan = planPuzzleGrid({
      photoAspectRatio: 3 / 4,
      availableWidth: 390,
      availableHeight: 600,
      preferredPieceCount: 12,
      minimumCellSizeCssPx: 52,
      candidates,
    });

    expect(plan).toMatchObject({
      columns: 3,
      rows: 4,
      pieceCount: 12,
      boardWidth: 390,
      boardHeight: 520,
      cellWidth: 130,
      cellHeight: 130,
      meetsMinimumCellSize: true,
    });
    expect(plan.boardWidth / plan.boardHeight).toBeCloseTo(3 / 4);
  });

  it('inverts the same piece count for landscape photography', () => {
    const plan = planPuzzleGrid({
      photoAspectRatio: 4 / 3,
      availableWidth: 600,
      availableHeight: 390,
      preferredPieceCount: 12,
      minimumCellSizeCssPx: 52,
      candidates,
    });

    expect(plan).toMatchObject({ columns: 4, rows: 3, pieceCount: 12 });
    expect(plan.boardWidth / plan.boardHeight).toBeCloseTo(4 / 3);
  });

  it('prefers an operable grid over a closer piece count when the stage is small', () => {
    const plan = planPuzzleGrid({
      photoAspectRatio: 1,
      availableWidth: 208,
      availableHeight: 208,
      preferredPieceCount: 20,
      minimumCellSizeCssPx: 52,
      candidates,
    });

    expect(plan).toMatchObject({ columns: 3, rows: 4, meetsMinimumCellSize: true });
  });

  it('rejects invalid source geometry before a renderer can distort it', () => {
    expect(() =>
      planPuzzleGrid({
        photoAspectRatio: 0,
        availableWidth: 390,
        availableHeight: 600,
        preferredPieceCount: 12,
        minimumCellSizeCssPx: 52,
      }),
    ).toThrow('positive finite values');
  });
});
