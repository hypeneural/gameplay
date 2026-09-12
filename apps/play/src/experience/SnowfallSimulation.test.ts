import { describe, expect, it } from 'vitest';
import { SnowfallSimulation } from './SnowfallSimulation.js';

describe('snowfall mechanics', () => {
  it('increases visible snow for a finite storm without growing the reserved pool', () => {
    const field = new SnowfallSimulation(390, 844, 7, 132);
    expect(field.particles.filter((p) => p.visibility > 0.1)).toHaveLength(48);
    field.snowMore(1);
    for (let i = 0; i < 30; i++) field.step(1 / 60);
    expect(field.particles.filter((p) => p.visibility > 0.9)).toHaveLength(132);
    for (let i = 0; i < 100; i++) field.snowMore(1);
    expect(field.particles).toHaveLength(132);
    for (let i = 0; i < 600; i++) field.step(1 / 60);
    expect(field.particles.filter((p) => p.visibility > 0.1)).toHaveLength(48);
  });
  it('replays the same bounded gust and field from the same seed', () => {
    const a = new SnowfallSimulation(390, 844);
    const b = new SnowfallSimulation(390, 844);
    a.gust(1);
    for (let i = 0; i < 100; i++) b.gust(1);
    for (let i = 0; i < 600; i++) {
      a.step(1 / 60);
      b.step(1 / 60);
    }
    expect(a.particles).toEqual(b.particles);
    expect(a.particles.every((p) => Math.abs(p.vx) < 20)).toBe(true);
  });
  it('has slower distant flakes and caps movement after a delayed frame', () => {
    const field = new SnowfallSimulation(390, 844);
    const before = field.particles.map((p) => p.y);
    field.step(30);
    const distances = field.particles.map((p, i) => p.y - before[i]!);
    expect(Math.max(...distances)).toBeLessThan(3);
    expect(distances[0]).toBeGreaterThan(distances[1]!);
  });
  it('preserves relative positions on resize and recycles without growing the pool', () => {
    const field = new SnowfallSimulation(390, 844);
    const before = field.particles[0]!;
    const x = before.x;
    const y = before.y;
    field.resize(780, 422);
    expect(before.x).toBeCloseTo(x * 2);
    expect(before.y).toBeCloseTo(y / 2);
    for (let i = 0; i < 10000; i++) field.step(0.04);
    expect(field.particles).toHaveLength(48);
    expect(field.particles.every((p) => p.x >= -12 && p.x <= 792 && p.y >= -12 && p.y <= 434)).toBe(
      true,
    );
  });
});
