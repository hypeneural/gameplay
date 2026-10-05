/** Game-feel values belong here; deterministic rules remain in domain/. */
export const lanternaMagicaTuning = {
  primaryTargetMinCssPx: 52,
  secondaryTargetMinCssPx: 44,
  dragDistanceThresholdPx: 16,
  dragTimeThresholdMs: 200,
  idleAssistDelayMs: 7000,
  pressScale: 0.98,
  pressDurationMs: 100,
  feedbackDurationMs: 160,
  hintPulseDurationMs: 600,
} as const;
