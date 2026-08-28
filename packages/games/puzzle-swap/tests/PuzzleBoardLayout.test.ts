import { createViewportLayout } from '@christmas-games/platform';
import { describe, expect, it } from 'vitest';
import { planPuzzleGrid } from '../src/domain/GridPlanner.js';
import {
  planPuzzleBoardLayout,
  puzzleSwapChromeMetrics,
} from '../src/runtime/phaser/PuzzleBoardLayout.js';

const legacyChrome = { headerHeightCssPx: 98, footerHeightCssPx: 74 } as const;
const supportedViewports = [
  [390, 844],
  [412, 915],
  [430, 932],
  [768, 1024],
] as const;

function planBeforeCompaction(width: number, height: number, photoAspectRatio: number) {
  const viewport = createViewportLayout(width, height);
  const availableWidth = width - 24;
  const availableHeight =
    viewport.contentHeight - legacyChrome.headerHeightCssPx - legacyChrome.footerHeightCssPx;
  return planPuzzleGrid({
    photoAspectRatio,
    availableWidth,
    availableHeight,
    preferredPieceCount: 12,
    minimumCellSizeCssPx: 52,
    candidates: [photoAspectRatio < 1 ? { columns: 3, rows: 4 } : { columns: 4, rows: 3 }],
  });
}

describe('PuzzleBoardLayout', () => {
  it.each(supportedViewports)(
    'recovers vertical board room without reducing 12-piece touch cells at %ix%i',
    (width, height) => {
      const viewport = createViewportLayout(width, height);
      const layout = planPuzzleBoardLayout({
        viewport,
        photoAspectRatio: 3 / 4,
        columns: 3,
        rows: 4,
        preferredPieceCount: 12,
        minimumCellSizeCssPx: 52,
        boardInsetCssPx: 12,
      });
      const before = planBeforeCompaction(width, height, 3 / 4);

      expect(layout.availableHeight).toBe(
        viewport.contentHeight -
          puzzleSwapChromeMetrics.headerHeightCssPx -
          puzzleSwapChromeMetrics.footerHeightCssPx,
      );
      expect(layout.availableHeight).toBe(
        viewport.contentHeight -
          legacyChrome.headerHeightCssPx -
          legacyChrome.footerHeightCssPx +
          26,
      );
      expect(layout.plan.meetsMinimumCellSize).toBe(true);
      expect(layout.plan.boardWidth * layout.plan.boardHeight).toBeGreaterThanOrEqual(
        before.boardWidth * before.boardHeight,
      );
      expect(layout.y).toBeGreaterThanOrEqual(
        viewport.safeTop + puzzleSwapChromeMetrics.headerHeightCssPx,
      );
      expect(layout.y + layout.plan.boardHeight).toBeLessThanOrEqual(
        height - viewport.safeBottom - puzzleSwapChromeMetrics.footerHeightCssPx,
      );
    },
  );

  it('increases the constrained tablet portrait board area by at least six percent', () => {
    const viewport = createViewportLayout(768, 1024);
    const layout = planPuzzleBoardLayout({
      viewport,
      photoAspectRatio: 3 / 4,
      columns: 3,
      rows: 4,
      preferredPieceCount: 12,
      minimumCellSizeCssPx: 52,
      boardInsetCssPx: 12,
    });
    const before = planBeforeCompaction(768, 1024, 3 / 4);

    expect(layout.plan.boardWidth * layout.plan.boardHeight).toBeGreaterThan(
      before.boardWidth * before.boardHeight * 1.06,
    );
  });

  it.each(supportedViewports)(
    'keeps voluntary 4x4 challenge pieces touch-safe at %ix%i',
    (width, height) => {
      const viewport = createViewportLayout(width, height);
      for (const photoAspectRatio of [3 / 4, 4 / 3]) {
        const layout = planPuzzleBoardLayout({
          viewport,
          photoAspectRatio,
          columns: 4,
          rows: 4,
          preferredPieceCount: 16,
          minimumCellSizeCssPx: 52,
          boardInsetCssPx: 12,
        });
        expect(layout.plan.meetsMinimumCellSize).toBe(true);
      }
    },
  );
});
