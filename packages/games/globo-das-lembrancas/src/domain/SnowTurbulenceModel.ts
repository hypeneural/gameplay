import type { NormalizedRect } from './GloboGeometry.js';

export type SnowLayer = 'background' | 'mid' | 'foreground';

export interface SnowParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  depthLayer: SnowLayer;
  isGoldStar: boolean;
}

export interface SnowModelOptions {
  count?: number;
  domeRadius?: number;
  safeZone?: NormalizedRect | undefined;
}

/**
 * Mathematical model for snow particles in a spherical snow globe across 3 optical depth layers.
 * Pure deterministic simulation without per-frame allocations.
 */
export class SnowTurbulenceModel {
  readonly particles: SnowParticle[];
  readonly domeRadius: number;
  private readonly safeZone: NormalizedRect | undefined;
  private readonly centerX = 0.5;
  private readonly centerY = 0.5;

  constructor(options: SnowModelOptions = {}) {
    const count = options.count ?? 60;
    this.domeRadius = options.domeRadius ?? 0.46;
    this.safeZone = options.safeZone;

    this.particles = Array.from({ length: count }, (_, id) => {
      // Deterministic initial distribution inside the sphere
      const angle = (id * 2.39996) % (Math.PI * 2); // Golden ratio angle
      const r = Math.sqrt((id + 1) / (count + 1)) * (this.domeRadius * 0.9);
      const isGoldStar = id % 7 === 0;

      // Assign optical depth layers:
      // ~20% foreground (large bokeh, faster drift)
      // ~40% background (tiny soft crystals behind portrait)
      // ~40% mid (crisp snowflakes around portrait)
      let depthLayer: SnowLayer = 'mid';
      let scale = 0.6 + (id % 4) * 0.15;
      let baseVy = 0.012 + (id % 5) * 0.004;

      if (id % 5 === 0) {
        depthLayer = 'foreground';
        scale = 1.35 + (id % 3) * 0.25;
        baseVy = 0.022 + (id % 3) * 0.006;
      } else if (id % 2 === 0) {
        depthLayer = 'background';
        scale = 0.35 + (id % 3) * 0.1;
        baseVy = 0.007 + (id % 4) * 0.003;
      }

      return {
        id,
        x: this.centerX + Math.cos(angle) * r,
        y: this.centerY + Math.sin(angle) * r,
        vx: 0,
        vy: baseVy,
        scale,
        depthLayer,
        isGoldStar,
      };
    });
  }

  /**
   * Applies an impulse or vortex force centered at (x, y).
   */
  applyVortex(x: number, y: number, impulseX: number, impulseY: number, radius = 0.3): void {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(impulseX) ||
      !Number.isFinite(impulseY)
    ) {
      return;
    }

    for (const p of this.particles) {
      const dx = p.x - x;
      const dy = p.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < radius * radius && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const factor = 1 - dist / radius;
        // Tangential vortex + direct impulse, modulated by optical depth layer
        const depthMultiplier =
          p.depthLayer === 'foreground' ? 1.25 : p.depthLayer === 'mid' ? 1.0 : 0.75;
        p.vx += ((-dy / dist) * factor * 0.35 + impulseX * factor * 0.25) * depthMultiplier;
        p.vy += ((dx / dist) * factor * 0.35 + impulseY * factor * 0.25) * depthMultiplier;
      }
    }
  }

  /**
   * Steps the particle simulation forward by dt seconds.
   */
  step(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const clampedDt = Math.min(dt, 0.05);

    const drag = Math.pow(0.92, clampedDt * 60);
    const gravity = 0.06 * clampedDt;
    const settlingLineY = this.centerY + this.domeRadius * 0.82;

    for (const p of this.particles) {
      // Near bottom settling resistance
      const isSettling = p.y >= settlingLineY;
      const currentDrag = isSettling ? Math.pow(0.85, clampedDt * 60) : drag;

      // Apply gravity and drag
      p.vy += isSettling ? gravity * 0.4 : gravity;
      p.vx *= currentDrag;
      p.vy *= currentDrag;

      // Update positions
      p.x += p.vx * clampedDt;
      p.y += p.vy * clampedDt;

      // Spherical boundary constraint
      const dx = p.x - this.centerX;
      const dy = p.y - this.centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > this.domeRadius) {
        const nx = dx / dist;
        const ny = dy / dist;
        // Project back onto boundary
        p.x = this.centerX + nx * this.domeRadius;
        p.y = this.centerY + ny * this.domeRadius;

        // Invert normal velocity with bounce restitution
        const dot = p.vx * nx + p.vy * ny;
        if (dot > 0) {
          p.vx -= 1.4 * dot * nx;
          p.vy -= 1.4 * dot * ny;
        }
      }

      // Safe zone repulsion: nudge snow away from family faces
      if (this.safeZone) {
        const faceCenterX = this.safeZone.x + this.safeZone.width / 2;
        const faceCenterY = this.safeZone.y + this.safeZone.height / 2;
        const faceRadius = Math.max(this.safeZone.width, this.safeZone.height) / 2 + 0.05;
        const fdx = p.x - faceCenterX;
        const fdy = p.y - faceCenterY;
        const fdist = Math.hypot(fdx, fdy);

        if (fdist < faceRadius && fdist > 0.001) {
          // Foreground large flakes are strongly repelled to never obscure facial expressions
          const pushMultiplier = p.depthLayer === 'foreground' ? 2.2 : 1.0;
          const push = (faceRadius - fdist) * 0.9 * pushMultiplier * clampedDt;
          p.x += (fdx / fdist) * push;
          p.y += (fdy / fdist) * push;
        }
      }
    }
  }
}
