export interface ExpressRailTravelTiming {
  readonly baseDurationMs: number;
  readonly minimumDurationMs: number;
  readonly millisecondsPerPixel: number;
}

export interface ExpressRailTravelPlan {
  readonly railLengthPx: number;
  readonly durationMs: number;
}

/** Plans a stable duration from measured rail length; the runtime samples the curve itself. */
export function planExpressRailTravel(
  railLengthPx: number,
  timing: ExpressRailTravelTiming,
): ExpressRailTravelPlan {
  if (!Number.isFinite(railLengthPx) || railLengthPx <= 0) {
    throw new Error('Expresso rail length must be a positive finite number.');
  }
  return {
    railLengthPx,
    durationMs: Math.max(
      timing.minimumDurationMs,
      Math.round(timing.baseDurationMs + railLengthPx * timing.millisecondsPerPixel),
    ),
  };
}
