import type { GameViewport } from '@christmas-games/platform';
import { planPuzzleGrid, type PuzzleGridPlan } from '../../domain/GridPlanner.js';

/**
 * Compact chrome keeps the photo as the primary surface while preserving the
 * 48 px touch bounds of sound, hint and pause controls.
 */
export const puzzleSwapChromeMetrics = {
  hudHeightCssPx: 68,
  headerHeightCssPx: 84,
  footerHeightCssPx: 62,
  titleOffsetCssPx: 20,
  progressOffsetCssPx: 45,
  controlOffsetCssPx: 50,
  coachMarkOffsetFromBottomCssPx: 31,
} as const;

export interface PuzzleBoardLayoutInput {
  readonly viewport: GameViewport;
  readonly photoAspectRatio: number;
  readonly columns: number;
  readonly rows: number;
  readonly preferredPieceCount: number;
  readonly minimumCellSizeCssPx: number;
  readonly boardInsetCssPx: number;
}

export interface PuzzleBoardLayout {
  readonly plan: PuzzleGridPlan;
  readonly x: number;
  readonly y: number;
  readonly availableWidth: number;
  readonly availableHeight: number;
}

/** Plans the proportional, touch-safe photo board inside the compact game chrome. */
export function planPuzzleBoardLayout(input: PuzzleBoardLayoutInput): PuzzleBoardLayout {
  const availableHeight = Math.max(
    1,
    input.viewport.contentHeight -
      puzzleSwapChromeMetrics.headerHeightCssPx -
      puzzleSwapChromeMetrics.footerHeightCssPx,
  );
  const availableWidth = Math.max(1, input.viewport.width - input.boardInsetCssPx * 2);
  const plan = planPuzzleGrid({
    photoAspectRatio: input.photoAspectRatio,
    availableWidth,
    availableHeight,
    preferredPieceCount: input.preferredPieceCount,
    minimumCellSizeCssPx: input.minimumCellSizeCssPx,
    candidates: [{ columns: input.columns, rows: input.rows }],
  });

  return {
    plan,
    x: (input.viewport.width - plan.boardWidth) / 2,
    y:
      input.viewport.safeTop +
      puzzleSwapChromeMetrics.headerHeightCssPx +
      (availableHeight - plan.boardHeight) / 2,
    availableWidth,
    availableHeight,
  };
}
