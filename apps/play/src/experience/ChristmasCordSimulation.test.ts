import { describe, expect, it } from 'vitest';
import { ChristmasCordSimulation } from './ChristmasCordSimulation.js';

describe('suspended Christmas cord', () => {
  it('has a slow bounded wind and a stronger strike that settles back into the wind', () => {
    const quiet = new ChristmasCordSimulation();
    const struck = new ChristmasCordSimulation();
    for (let i = 0; i < 600; i++) {
      quiet.step(1 / 60);
      struck.step(1 / 60);
    }
    struck.ring();
    let difference = 0;
    for (let i = 0; i < 60; i++) {
      quiet.step(1 / 60);
      struck.step(1 / 60);
      difference = Math.max(difference, Math.abs(struck.angle - quiet.angle));
    }
    expect(difference).toBeGreaterThan(10);
    for (let i = 0; i < 600; i++) {
      quiet.step(1 / 60);
      struck.step(1 / 60);
    }
    expect(struck.angle).toBeCloseTo(quiet.angle, 2);
    expect(Math.abs(quiet.angle)).toBeLessThan(4);
    expect(struck.sag).toBeGreaterThan(33);
    expect(struck.sag).toBeLessThan(47);
  });
  it('repeated strikes replace the impulse and a long suspended frame stays bounded', () => {
    const a = new ChristmasCordSimulation();
    const b = new ChristmasCordSimulation();
    a.ring();
    for (let i = 0; i < 100; i++) b.ring();
    a.step(0.04);
    b.step(30);
    expect(a.angle).toEqual(b.angle);
    expect(Math.abs(b.angle)).toBeLessThan(6);
  });
});
