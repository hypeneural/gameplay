/** Game-feel values belong here; deterministic rules remain in domain/. */
export const renaDasLembrancasTuning = {
  fixedStepSeconds: 1 / 60,
  heroSeconds: 0.85,
  repeatHeroSeconds: 0.6,
  heroTravelSeconds: 0.28,
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
