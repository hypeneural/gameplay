import { describe, expect, it } from 'vitest';
import { SnowTurbulenceModel } from '../src/domain/SnowTurbulenceModel.js';

describe('SnowTurbulenceModel', () => {
  it('creates particle pool bounded within dome radius', () => {
    const model = new SnowTurbulenceModel({ count: 40, domeRadius: 0.45 });
    expect(model.particles.length).toBe(40);

    for (const p of model.particles) {
      const distFromCenter = Math.hypot(p.x - 0.5, p.y - 0.5);
      expect(distFromCenter).toBeLessThanOrEqual(0.45);
      expect(p.scale).toBeGreaterThan(0);
    }
  });

  it('keeps particles confined inside spherical dome during simulation step', () => {
    const model = new SnowTurbulenceModel({ count: 30, domeRadius: 0.45 });

    // Step physics forward 60 frames (1 second)
    for (let i = 0; i < 60; i++) {
      model.step(1 / 60);
    }

    for (const p of model.particles) {
      const distFromCenter = Math.hypot(p.x - 0.5, p.y - 0.5);
      // Small margin of numeric precision for rebound
      expect(distFromCenter).toBeLessThanOrEqual(0.46);
    }
  });

  it('applies vortex impulse to particles within range', () => {
    const model = new SnowTurbulenceModel({ count: 30 });
    const pInitialVx = model.particles[0]!.vx;
    const pInitialVy = model.particles[0]!.vy;

    model.applyVortex(0.5, 0.5, 2.0, 0, 0.4);

    // Velocities should be altered by the impulse
    const pNewVx = model.particles[0]!.vx;
    const pNewVy = model.particles[0]!.vy;
    expect(pNewVx !== pInitialVx || pNewVy !== pInitialVy).toBe(true);
  });

  it('repels particles gently away from faceSafeZone', () => {
    const safeZone = { x: 0.4, y: 0.4, width: 0.2, height: 0.2 };
    const model = new SnowTurbulenceModel({ count: 20, safeZone });

    // Place a particle exactly in the center of the safe zone
    model.particles[0]!.x = 0.5;
    model.particles[0]!.y = 0.5;

    model.step(0.05);

    // Particle should have moved away from (0.5, 0.5)
    const distFromSafeCenter = Math.hypot(model.particles[0]!.x - 0.5, model.particles[0]!.y - 0.5);
    expect(distFromSafeCenter).toBeGreaterThan(0);
  });
});
