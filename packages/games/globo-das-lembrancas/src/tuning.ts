/** Game-feel values belong here; deterministic rules remain in domain/. */
export const globoDasLembrancasTuning = {
  primaryTargetMinCssPx: 52,
  secondaryTargetMinCssPx: 44,
  dragDistanceThresholdPx: 16,
  dragTimeThresholdMs: 200,
  idleAssistDelayMs: 6500,
  pressScale: 0.97,
  pressDurationMs: 110,
  feedbackDurationMs: 160,
  hintPulseDurationMs: 650,
  keyTurnsRequired: 3,
  keyRatchetStepRad: Math.PI / 4, // 45 degrees per ratchet click
  steamClearThreshold: 0.65, // 65% cleared triggers transition
  steamBrushRadiusNormalized: 0.12,
  audioCooldownMs: 90,
  normalParticleCount: 60,
  lowParticleCount: 24,
} as const;
