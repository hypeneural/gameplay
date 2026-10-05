export interface WindingTrackerOptions {
  turnsRequired?: number;
  ratchetStepRad?: number;
  maxBacklashRad?: number;
}

/**
 * Tracks physical wind-up key rotation with continuous angular tracking,
 * one-way ratchet, micro-backlash, mechanical spring resistance, and accessible tap mode.
 * Deterministic domain model: pure math, zero external dependencies.
 */
export class WindingTracker {
  readonly turnsRequired: number;
  readonly ratchetStepRad: number;
  readonly maxBacklashRad: number;
  turns = 0;
  progress = 0;
  backlash = 0;
  private lastAngle: number | undefined;
  private ratchetAccumulator = 0;

  constructor(options: WindingTrackerOptions = {}) {
    this.turnsRequired = Math.max(1, options.turnsRequired ?? 3);
    // 18 degrees per ratchet click (Math.PI / 10 = ~18°) gives authentic fine clockwork feel
    this.ratchetStepRad = options.ratchetStepRad ?? Math.PI / 10;
    this.maxBacklashRad = options.maxBacklashRad ?? 0.08; // ~4.5 degrees of mechanical play
  }

  get isFullyWound(): boolean {
    return this.progress >= 1.0;
  }

  /**
   * Mechanical spring resistance (0.35 when loose, 1.0 when tightly wound).
   */
  get resistance(): number {
    return 0.35 + 0.65 * this.progress;
  }

  /**
   * Processes a pointer angle change in radians relative to the key pivot.
   * Clockwise rotation advances the spring; counter-clockwise is arrested by the ratchet with slight mechanical backlash.
   * Returns the count of ratchet clicks triggered in this movement.
   */
  rotate(currentAngleRad: number): number {
    if (!Number.isFinite(currentAngleRad)) return 0;
    if (this.lastAngle === undefined) {
      this.lastAngle = currentAngleRad;
      return 0;
    }

    let delta = currentAngleRad - this.lastAngle;
    // Normalize quadrant wrap around -PI / +PI
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    this.lastAngle = currentAngleRad;

    // Counter-clockwise movement: arrested by ratchet, allows subtle mechanical backlash
    if (delta < 0) {
      this.backlash = Math.max(-this.maxBacklashRad, this.backlash + delta);
      return 0;
    }

    // Moving forward takes up any backlash first
    if (this.backlash < 0) {
      const takeUp = Math.min(-this.backlash, delta);
      this.backlash += takeUp;
      delta -= takeUp;
      if (delta <= 0) return 0;
    }

    if (this.isFullyWound) {
      return 0;
    }

    this.turns += delta / (Math.PI * 2);
    this.progress = Math.min(1.0, this.turns / this.turnsRequired);

    this.ratchetAccumulator += delta;
    let clicks = 0;
    while (this.ratchetAccumulator >= this.ratchetStepRad) {
      this.ratchetAccumulator -= this.ratchetStepRad;
      clicks++;
    }

    return clicks;
  }

  /**
   * Accessible alternative for younger children: single tap advances 25% of a turn.
   * Returns the count of ratchet clicks triggered.
   */
  tapStep(): number {
    if (this.isFullyWound) return 0;
    const stepAngle = Math.PI / 2; // 90 degrees
    this.turns += 0.25;
    this.progress = Math.min(1.0, this.turns / this.turnsRequired);
    this.backlash = 0;

    this.ratchetAccumulator += stepAngle;
    let clicks = 0;
    while (this.ratchetAccumulator >= this.ratchetStepRad) {
      this.ratchetAccumulator -= this.ratchetStepRad;
      clicks++;
    }
    return Math.max(1, clicks);
  }

  resetAngleTracking(): void {
    this.lastAngle = undefined;
    this.backlash = 0;
  }
}
