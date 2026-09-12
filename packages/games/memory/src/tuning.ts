import { childTouchProfile } from '@christmas-games/theme';

/** Product tuning is local to Memory and can be revised after mobile evidence. */
export const memoryTuning = {
  assetMaxRetries: 1,
  assetTimeoutMs: 10_000,
  controlTargetMinCssPx: childTouchProfile.primaryTargetMinCssPx,
  flipHalfDurationMs: 110,
  matchRecognitionDelayMs: 240,
  mismatchDelayMs: 750,
  pressDurationMs: 70,
} as const;
