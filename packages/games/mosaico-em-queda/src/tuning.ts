/** Game-feel values belong here; deterministic rules remain in domain/. */
export const mosaicoEmQuedaTuning = {
  assetMaxRetries: 1,
  assetTimeoutMs: 8_000,
  primaryTargetMinCssPx: 52,
  secondaryTargetMinCssPx: 44,
  dragTimeThresholdMs: 200,
  idleAssistDelayMs: 7000,
  pressScale: 0.98,
  pressDurationMs: 100,
  feedbackDurationMs: 160,
  hintPulseDurationMs: 600,
} as const;
