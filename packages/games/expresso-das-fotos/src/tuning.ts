/** Game-feel values belong here; deterministic rules remain in domain/. */
export const expressoDasFotosTuning = {
  /** Minimum hit area after the runtime converts the design to CSS pixels. */
  primaryTargetMinCssPx: 64,
  secondaryTargetMinCssPx: 48,
  idleAssistDelayMs: 6500,
  stationPressScale: 0.975,
  stationPressDurationMs: 90,
  feedbackDurationMs: 180,
  hintPulseDurationMs: 720,
  trackSwitchDurationMs: 260,
  railTravelBaseDurationMs: 220,
  railTravelMinimumDurationMs: 620,
  railTravelMillisecondsPerPixel: 1.65,
  deliveryDurationMs: 440,
  arrivalSettleDurationMs: 220,
  snowBurstParticleCount: 14,
  maximumRouteStops: 6,
} as const;
