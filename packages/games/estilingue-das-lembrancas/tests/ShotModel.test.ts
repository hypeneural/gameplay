import { describe, expect, it } from 'vitest';
import {
  calculatePull,
  calculateRelativeSpeed,
  calculateSquashStretch,
  classifyImpact,
  isPullWithinCone,
} from '../src/domain/ShotModel.js';

describe('ShotModel (Cinemática e Tração)', () => {
  const rest = { x: 200, y: 600 };
  const maxPull = 160;
  const minPull = 22;
  const velocityMultiplier = 0.3;

  it('calcula tração para baixo dentro do cone válido', () => {
    // Puxada para baixo: y aumenta de 600 para 700 (drag = 100px para baixo)
    const pointer = { x: 200, y: 700 };
    const pull = calculatePull(rest, pointer, maxPull, minPull, velocityMultiplier);

    expect(pull.rawDistance).toBeCloseTo(100, 1);
    expect(pull.clampedDistance).toBeCloseTo(100, 1);
    expect(pull.powerRatio).toBeCloseTo(100 / 160, 2);
    expect(pull.isWithinCone).toBe(true);
    expect(pull.isValidPull).toBe(true);

    // O vetor de lançamento deve apontar para cima (launchVelocity.y < 0)
    expect(pull.launchVelocity.x).toBeCloseTo(0, 1);
    expect(pull.launchVelocity.y).toBeLessThan(0);
    expect(Math.hypot(pull.launchVelocity.x, pull.launchVelocity.y)).toBeCloseTo(30, 1);
  });

  it('aplica clamp quando a puxada excede maxPull', () => {
    const pointer = { x: 200, y: 900 }; // 300px de distância
    const pull = calculatePull(rest, pointer, maxPull, minPull, velocityMultiplier);

    expect(pull.rawDistance).toBe(300);
    expect(pull.clampedDistance).toBe(maxPull);
    expect(pull.powerRatio).toBe(1.0);
    expect(pull.clampedPouchPosition.y).toBe(rest.y + maxPull);
  });

  it('invalida disparo quando a puxada é menor que minPull', () => {
    const pointer = { x: 200, y: 610 }; // 10px apenas (< 22px)
    const pull = calculatePull(rest, pointer, maxPull, minPull, velocityMultiplier);

    expect(pull.rawDistance).toBe(10);
    expect(pull.isWithinCone).toBe(true);
    expect(pull.isValidPull).toBe(false);
  });

  it('rejeita puxadas fora do cone (ex: puxar para cima ou para dentro do estilingue)', () => {
    // Puxada para cima (y = 500, acima do rest y = 600)
    const pointerUp = { x: 200, y: 500 };
    const pullUp = calculatePull(rest, pointerUp, maxPull, minPull, velocityMultiplier);

    expect(pullUp.isWithinCone).toBe(false);
    expect(pullUp.isValidPull).toBe(false);

    // Teste direto de cone
    expect(isPullWithinCone(0, 100)).toBe(true); // Direto para baixo
    expect(isPullWithinCone(50, 100)).toBe(true); // Diagonal para baixo
    expect(isPullWithinCone(0, -100)).toBe(false); // Direto para cima
  });

  it('calcula squash & stretch proporcional ao ângulo de lançamento', () => {
    // Disparo vertical para cima (-PI/2)
    const stretchVertical = calculateSquashStretch(-Math.PI / 2, 0.15);
    expect(stretchVertical.scaleX).toBeCloseTo(1.0, 2);
    expect(stretchVertical.scaleY).toBeCloseTo(1.15, 2);

    // Disparo horizontal (0 rad)
    const stretchHorizontal = calculateSquashStretch(0, 0.15);
    expect(stretchHorizontal.scaleX).toBeCloseTo(1.15, 2);
    expect(stretchHorizontal.scaleY).toBeCloseTo(1.0, 2);
  });

  it('calcula velocidade relativa e classifica o impacto', () => {
    const velA = { x: 10, y: -5 };
    const velB = { x: 2, y: 1 };
    const speed = calculateRelativeSpeed(velA, velB); // (10-2)^2 + (-5-1)^2 = 64 + 36 = 100 -> 10
    expect(speed).toBeCloseTo(10, 1);

    expect(classifyImpact(2.0)).toBe('none');
    expect(classifyImpact(4.5)).toBe('soft');
    expect(classifyImpact(8.0)).toBe('valid');
    expect(classifyImpact(15.0)).toBe('hard');
  });

  it('prova matematicamente que o impulso máximo alcança os alvos superiores', () => {
    // Slingshot rest y = 600, target superior y = 200 (deltaY = 400px)
    const pull = calculatePull(rest, { x: 200, y: 770 }, 170, 20, 0.165);
    expect(pull.isValidPull).toBe(true);
    expect(pull.powerRatio).toBe(1.0);

    // Velocidade vertical inicial: vy = 170 * 0.165 = 28.05 px/frame
    const vy = Math.abs(pull.launchVelocity.y);
    expect(vy).toBeGreaterThanOrEqual(25);

    // Com gravidade real Matter gy = 0.264 px/frame^2, a altura teórica do ápice (vy^2 / 2gy)
    // é 28.05^2 / (2 * 0.264) = 786.8 / 0.528 = 1490 px, alcançando com folga máxima os alvos superiores.
    const theoreticalApexDistance = (vy * vy) / (2 * 0.264);
    expect(theoreticalApexDistance).toBeGreaterThan(800);
  });
});
