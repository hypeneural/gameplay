import { childTouchProfile } from '@christmas-games/theme';

/** Initial product values to revise after child-use observation. */
export const puzzleSwapTuning = {
  preferredPieceCount: 12,
  minimumCellSizeCssPx: childTouchProfile.primaryTargetMinCssPx,
  dragDistanceThresholdPx: childTouchProfile.dragDistanceThresholdPx,
  idleAssistDelayMs: childTouchProfile.idleAssistDelayMs,
  boardInsetCssPx: 12,
} as const;
