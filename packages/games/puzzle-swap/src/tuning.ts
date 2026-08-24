import { childTouchProfile } from '@christmas-games/theme';

/** Initial product values to revise after child-use observation. */
export const puzzleSwapTuning = {
  preferredPieceCount: 12,
  minimumCellSizeCssPx: childTouchProfile.primaryTargetMinCssPx,
  dragDistanceThresholdPx: childTouchProfile.dragDistanceThresholdPx,
  idleAssistDelayMs: childTouchProfile.idleAssistDelayMs,
  boardInsetCssPx: 12,
  swapDurationMs: 160,
  revealDurationMs: 520,
  ambientSnowflakes: { NORMAL: 10, HIGH: 18 } as const,
} as const;
