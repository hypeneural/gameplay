export interface SnowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  visibility: number;
  readonly depth: number;
  readonly phase: number;
  readonly size: number;
}

/** Small deterministic field. Time and dimensions are supplied by its owner. */
export class SnowfallSimulation {
  readonly particles: SnowParticle[];
  private elapsed = 0;
  private wind = 0;
  private stormRemaining = 0;
  private seed: number;

  constructor(
    private width: number,
    private height: number,
    seed = 20260907,
    count = 48,
  ) {
    this.seed = seed >>> 0;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.particles = Array.from({ length: Math.min(160, Math.max(0, count)) }, (_, index) => {
      const depth = index % 6 === 0 ? 0.9 : index % 3 === 0 ? 0.55 : 0.18;
      return {
        x: this.random() * this.width,
        y: this.random() * this.height,
        vx: 0,
        vy: 15 + depth * 43,
        angle: this.random() * 360,
        visibility: index < 48 ? 1 : 0,
        phase: this.random() * Math.PI * 2,
        depth,
        size: 1.3 + depth * 5.5,
      };
    });
  }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  gust(direction: number): void {
    // Repeated input replaces the impulse; it never accumulates unlimited force.
    this.wind = Math.sign(direction || 1) * 92;
  }

  snowMore(direction: number): void {
    this.gust(direction);
    this.stormRemaining = 6;
  }

  resize(width: number, height: number): void {
    const nextWidth = Math.max(1, width);
    const nextHeight = Math.max(1, height);
    for (const particle of this.particles) {
      particle.x *= nextWidth / this.width;
      particle.y *= nextHeight / this.height;
    }
    this.width = nextWidth;
    this.height = nextHeight;
  }

  step(seconds: number): void {
    const dt = Math.min(0.04, Math.max(0, seconds));
    this.elapsed += dt;
    this.wind *= Math.exp(-dt * 1.35);
    this.stormRemaining = Math.max(0, this.stormRemaining - dt);
    for (const [index, particle] of this.particles.entries()) {
      const target = index < 48 ? 1 : Math.min(1, this.stormRemaining / 1.8);
      particle.visibility += (target - particle.visibility) * (1 - Math.exp(-dt * 10));
      if (particle.visibility < 0.002 && index >= 48) {
        particle.visibility = 0;
        continue;
      }
      const drift =
        Math.sin(this.elapsed * 0.45 + particle.phase) * 8 +
        Math.sin(this.elapsed * 1.15 + particle.phase * 2) * 3;
      const targetWind = drift + this.wind * (0.3 + particle.depth * 0.8);
      particle.vx += (targetWind - particle.vx) * (1 - Math.exp(-dt * 2.2));
      const terminal = 15 + particle.depth * 43;
      particle.vy += (terminal - particle.vy) * (1 - Math.exp(-dt * 1.8));
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.angle += Math.sin(this.elapsed + particle.phase) * 18 * dt;
      if (particle.x < -12) particle.x = this.width + 10;
      if (particle.x > this.width + 12) particle.x = -10;
      if (particle.y > this.height + 12) {
        particle.y = -12;
        particle.x = this.random() * this.width;
        particle.vy = terminal * 0.7;
      }
    }
  }
}
