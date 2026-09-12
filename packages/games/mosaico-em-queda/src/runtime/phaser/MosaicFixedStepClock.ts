/** Mechanics always advance at 60 Hz; presentation can render at any display rate. */
export const MOSAIC_FIXED_STEP_MS = 1000 / 60;
export const MOSAIC_MAX_STEPS_PER_PRESENTATION = 5;
const STEP_EPSILON_MS = 0.000_001;

export class MosaicFixedStepClock {
  private accumulatorMs = 0;

  advance(deltaMs: number, step: () => void): number {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
    const maximumAccumulation = MOSAIC_FIXED_STEP_MS * MOSAIC_MAX_STEPS_PER_PRESENTATION;
    this.accumulatorMs = Math.min(maximumAccumulation, this.accumulatorMs + deltaMs);
    let steps = 0;
    while (
      this.accumulatorMs + STEP_EPSILON_MS >= MOSAIC_FIXED_STEP_MS &&
      steps < MOSAIC_MAX_STEPS_PER_PRESENTATION
    ) {
      this.accumulatorMs = Math.max(0, this.accumulatorMs - MOSAIC_FIXED_STEP_MS);
      steps += 1;
      step();
    }
    if (steps === MOSAIC_MAX_STEPS_PER_PRESENTATION) this.accumulatorMs = 0;
    return steps;
  }

  reset(): void {
    this.accumulatorMs = 0;
  }

  get pendingMs(): number {
    return this.accumulatorMs;
  }
}
