export interface VerletParticle {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  pinned: boolean;
}

export interface VerletBandConfig {
  segments: number;
  restLengthMultiplier: number;
  damping: number;
  gravity: number;
  waveSpeed: number;
  waveDecay: number;
  oscillationDecay: number;
  constraintIterations: number;
  tautLerpFactor: number;
}

const DEFAULT_BAND_CONFIG: VerletBandConfig = {
  segments: 6,
  restLengthMultiplier: 0.95,
  damping: 0.92,
  gravity: 0.05,
  waveSpeed: 0.28,
  waveDecay: 0.88,
  oscillationDecay: 0.9,
  constraintIterations: 3,
  tautLerpFactor: 0.65,
};

export class SlingshotBand {
  readonly particles: VerletParticle[] = [];
  readonly config: VerletBandConfig;
  private restLength: number;
  private anchorX: number;
  private anchorY: number;
  private currentEndX: number;
  private currentEndY: number;

  private wavePhase = 0;
  private waveIntensity = 0;
  private oscillationPhase = 0;
  private oscillationAmplitude = 0;
  private variationSeed = 0;

  constructor(
    anchorX: number,
    anchorY: number,
    endX: number,
    endY: number,
    config: Partial<VerletBandConfig> = {},
  ) {
    this.config = { ...DEFAULT_BAND_CONFIG, ...config };
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.currentEndX = endX;
    this.currentEndY = endY;

    for (let i = 0; i <= this.config.segments; i++) {
      const t = i / this.config.segments;
      const x = anchorX + (endX - anchorX) * t;
      const y = anchorY + (endY - anchorY) * t;
      this.particles.push({
        x,
        y,
        oldX: x,
        oldY: y,
        pinned: i === 0, // Particle 0 is pinned to the fork tip
      });
    }

    const dist = Math.hypot(endX - anchorX, endY - anchorY);
    this.restLength = (dist / this.config.segments) * this.config.restLengthMultiplier;
  }

  setEndPoint(x: number, y: number, taut = false): void {
    const last = this.particles[this.particles.length - 1];
    if (!last) return;

    this.currentEndX = x;
    this.currentEndY = y;
    last.x = x;
    last.y = y;

    // During AIMING (taut: true):
    // Linearly pull middle particles towards the straight line between anchor and pouch.
    // This provides zero-lag, tensioned visual response to the child's touch.
    if (taut) {
      const first = this.particles[0]!;
      for (let i = 1; i < this.particles.length - 1; i++) {
        const p = this.particles[i]!;
        const t = i / this.config.segments;
        const targetX = first.x + (x - first.x) * t;
        const targetY = first.y + (y - first.y) * t;

        p.x = p.x + (targetX - p.x) * this.config.tautLerpFactor;
        p.y = p.y + (targetY - p.y) * this.config.tautLerpFactor;
        p.oldX = p.x;
        p.oldY = p.y;
      }
    } else {
      // In free motion (whip / snap back): impart velocity towards the moving endpoint
      const vx = x - last.oldX;
      const vy = y - last.oldY;
      for (let i = 1; i < this.particles.length - 1; i++) {
        const p = this.particles[i]!;
        const t = i / this.config.segments;
        p.oldX = p.x - vx * (t * 0.45);
        p.oldY = p.y - vy * (t * 0.45);
      }
    }
  }

  applyWaveImpulse(intensity: number): void {
    this.wavePhase = 0;
    this.waveIntensity = intensity * 14.0;
    this.oscillationAmplitude = intensity * 10.0;
    this.oscillationPhase = 0;
  }

  setVariationSeed(seed: number): void {
    this.variationSeed = seed;
  }

  update(): void {
    // 1. Decay wave energies
    if (this.waveIntensity > 0.05) {
      this.wavePhase += this.config.waveSpeed;
      this.waveIntensity *= this.config.waveDecay;
    } else {
      this.waveIntensity = 0;
      this.wavePhase = 0;
    }

    if (this.oscillationAmplitude > 0.05) {
      this.oscillationPhase += 0.4 + this.variationSeed * 0.15;
      this.oscillationAmplitude *= this.config.oscillationDecay;
    } else {
      this.oscillationAmplitude = 0;
    }

    // 2. Normal vector perpendicular to the band
    const dx = this.currentEndX - this.anchorX;
    const dy = this.currentEndY - this.anchorY;
    const bandLength = Math.hypot(dx, dy);
    const perpX = bandLength > 1 ? -dy / bandLength : 0;
    const perpY = bandLength > 1 ? dx / bandLength : 0;

    // 3. Integrate Verlet particles
    for (let i = 1; i < this.particles.length - 1; i++) {
      const p = this.particles[i]!;
      const vx = (p.x - p.oldX) * this.config.damping;
      const vy = (p.y - p.oldY) * this.config.damping;

      p.oldX = p.x;
      p.oldY = p.y;

      const t = i / (this.particles.length - 1);
      const middleFactor = Math.sin(t * Math.PI);

      const travelingWave =
        Math.sin((t - this.wavePhase) * Math.PI * 2) * this.waveIntensity * middleFactor;

      const standingWave =
        Math.sin(t * Math.PI * 2 + this.oscillationPhase) *
        this.oscillationAmplitude *
        middleFactor;

      p.x += vx + (travelingWave + standingWave) * perpX;
      p.y += vy + this.config.gravity + (travelingWave + standingWave) * perpY;
    }

    // 4. Solve distance constraints
    for (let iter = 0; iter < this.config.constraintIterations; iter++) {
      this.solveConstraints();
    }
  }

  private solveConstraints(): void {
    for (let i = 0; i < this.particles.length - 1; i++) {
      const p1 = this.particles[i]!;
      const p2 = this.particles[i + 1]!;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 0.001) continue;
      const diff = ((dist - this.restLength) / dist) * 0.5;

      if (!p1.pinned) {
        p1.x += dx * diff;
        p1.y += dy * diff;
      }
      if (!p2.pinned && i + 1 !== this.particles.length - 1) {
        p2.x -= dx * diff;
        p2.y -= dy * diff;
      }
    }
  }

  getPoints(): Array<{ x: number; y: number }> {
    return this.particles.map((p) => ({ x: p.x, y: p.y }));
  }

  reset(anchorX: number, anchorY: number, endX: number, endY: number): void {
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.currentEndX = endX;
    this.currentEndY = endY;
    this.wavePhase = 0;
    this.waveIntensity = 0;
    this.oscillationPhase = 0;
    this.oscillationAmplitude = 0;

    for (let i = 0; i <= this.config.segments; i++) {
      const t = i / this.config.segments;
      const x = anchorX + (endX - anchorX) * t;
      const y = anchorY + (endY - anchorY) * t;
      const p = this.particles[i]!;
      p.x = x;
      p.y = y;
      p.oldX = x;
      p.oldY = y;
      p.pinned = i === 0;
    }
  }
}
