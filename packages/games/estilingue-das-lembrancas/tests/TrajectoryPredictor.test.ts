import { describe, expect, it } from 'vitest';
import { TrajectoryPredictor } from '../src/runtime/phaser/TrajectoryPredictor.js';

describe('TrajectoryPredictor (Simulação Balística Exata)', () => {
  const gravity = { x: 0, y: 0.9, scale: 0.001 };
  const predictor = new TrajectoryPredictor(gravity);

  it('gera pontos contínuos no arco balístico ascendente e descendente', () => {
    const startX = 200;
    const startY = 600;
    const vx = 10;
    const vy = -4; // Lançado para cima com velocidade moderada para observar o ápice

    const points = predictor.simulate(startX, startY, vx, vy, {
      radius: 24,
      mass: 1.2,
      frictionAir: 0.006,
      totalSteps: 30,
      framesPerDot: 2,
      deltaMs: 16.6666667,
    });

    expect(points.length).toBe(30);

    // O primeiro ponto avança em X e sobe em Y (y diminui)
    expect(points[0]!.x).toBeGreaterThan(startX);
    expect(points[0]!.y).toBeLessThan(startY);

    // A trajetória atinge um ápice e a gravidade curva para baixo
    let hasReachedApex = false;
    for (let i = 1; i < points.length; i++) {
      if (points[i]!.y > points[i - 1]!.y) {
        hasReachedApex = true;
        break;
      }
    }
    expect(hasReachedApex).toBe(true);
  });

  it('calcula aceleração vertical idêntica ao Matter.js Body.update', () => {
    const points = predictor.simulate(100, 500, 0, 0, {
      radius: 20,
      mass: 1.0,
      frictionAir: 0,
      totalSteps: 1,
      framesPerDot: 1,
      deltaMs: 16.6666667,
    });

    // Queda livre a partir do repouso em 1 frame:
    // delta = 16.6666667, deltaSquared = 277.77778
    // force.y / mass * deltaSquared = 0.9 * 0.001 * 277.77778 = 0.25 px
    // position.y = 500 + 0.25 = 500.25
    expect(points[0]!.y).toBeCloseTo(500.25, 2);
  });
});
