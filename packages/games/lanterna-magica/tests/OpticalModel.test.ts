import { describe, expect, it } from 'vitest';
import {
  dotProduct,
  intersectRayWithSegment,
  normalizeAngle,
  normalizeVector,
  reflectVector,
  simulateOptics,
  snapAngle,
  type LightSourceConfig,
  type MirrorConfig,
  type TargetLensConfig,
  type BonusStarConfig,
} from '../src/domain/OpticalModel.js';

describe('OpticalModel — Traçado de Raios e Reflexão Especular', () => {
  it('normaliza vetores e calcula produto escalar com precisão', () => {
    const v = normalizeVector({ x: 3, y: 4 });
    expect(v.x).toBeCloseTo(0.6, 5);
    expect(v.y).toBeCloseTo(0.8, 5);

    const dot = dotProduct({ x: 1, y: 0 }, { x: 0, y: 1 });
    expect(dot).toBeCloseTo(0, 5);

    const dotParallel = dotProduct({ x: 1, y: 0 }, { x: 1, y: 0 });
    expect(dotParallel).toBeCloseTo(1, 5);
  });

  it('normaliza ângulos para o intervalo [0, 2 * PI)', () => {
    expect(normalizeAngle(0)).toBeCloseTo(0, 5);
    expect(normalizeAngle(Math.PI * 2)).toBeCloseTo(0, 5);
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 5);
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 5);
  });

  it('aplica snap magnético suave em múltiplos de 15 graus', () => {
    const step15 = Math.PI / 12; // 15°
    // 16° está a 1° de 15° (dentro da tolerância de 5°) -> faz snap para 15°
    const angle16Deg = (16 * Math.PI) / 180;
    expect(snapAngle(angle16Deg, step15)).toBeCloseTo(step15, 5);

    // 22° está longe de 15° e de 30° -> mantém 22°
    const angle22Deg = (22 * Math.PI) / 180;
    expect(snapAngle(angle22Deg, step15)).toBeCloseTo(angle22Deg, 5);
  });

  it('calcula reflexão especular correta (espelho a 45 graus desvia feixe em 90 graus)', () => {
    // Feixe vindo da esquerda para direita: dir = (1, 0)
    // Espelho inclinado a 45°: normal aponta para noroeste (-sqrt(2)/2, -sqrt(2)/2)
    // O raio deve ser refletido para baixo: dir = (0, 1) ou para cima (0, -1) dependendo da normal
    const incident = { x: 1, y: 0 };
    const normal = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
    const reflected = reflectVector(incident, normal);

    expect(reflected.x).toBeCloseTo(0, 4);
    expect(reflected.y).toBeCloseTo(-1, 4);
  });

  it('detecta interseção de raio com segmento de espelho', () => {
    const origin = { x: 100, y: 200 };
    const dir = { x: 1, y: 0 }; // Raio indo para a direita
    const segA = { x: 300, y: 150 };
    const segB = { x: 300, y: 250 }; // Espelho vertical em x = 300

    const hit = intersectRayWithSegment(origin, dir, segA, segB);
    expect(hit).not.toBeNull();
    expect(hit!.distance).toBeCloseTo(200, 4);
    expect(hit!.hitPoint.x).toBeCloseTo(300, 4);
    expect(hit!.hitPoint.y).toBeCloseTo(200, 4);
    expect(hit!.normal.x).toBeCloseTo(-1, 4); // Normal apontando contra o raio
    expect(hit!.normal.y).toBeCloseTo(0, 4);
  });

  it('simula quebra-cabeça óptico completo: Fonte -> Espelho 1 -> Espelho 2 -> Lente do Projetor', () => {
    // 1. Fonte de luz em (100, 500) atirando para a direita (1, 0)
    const source: LightSourceConfig = {
      origin: { x: 100, y: 500 },
      direction: { x: 1, y: 0 },
      color: '#ffd700',
    };

    // 2. Espelho 1 em (300, 500), ângulo de -45° (-PI/4) refletindo a luz para cima (0, -1)
    const mirror1: MirrorConfig = {
      id: 'mirror-1',
      center: { x: 300, y: 500 },
      length: 80,
      angleRad: -Math.PI / 4,
      isRotatable: true,
    };

    // 3. Espelho 2 em (300, 200), ângulo de 45° (PI/4) refletindo a luz para a esquerda (-1, 0)
    const mirror2: MirrorConfig = {
      id: 'mirror-2',
      center: { x: 300, y: 200 },
      length: 80,
      angleRad: Math.PI / 4,
      isRotatable: true,
    };

    // 4. Lente do Projetor em (150, 200), esperando luz vinda da direita (normal apontando para a direita: 0 rad)
    const targetLens: TargetLensConfig = {
      center: { x: 150, y: 200 },
      radius: 30,
      normalAngleRad: 0,
      acceptanceConeRad: 1.2,
    };

    // 5. Estrela bônus no caminho vertical entre espelho 1 e espelho 2
    const star: BonusStarConfig = {
      id: 'star-1',
      center: { x: 300, y: 350 },
      radius: 20,
    };

    const sim = simulateOptics(source, [mirror1, mirror2], targetLens, [star]);

    // Deve ter gerado 3 segmentos de raio:
    // Seg 1: (100, 500) -> (300, 500)
    // Seg 2: (300, 500) -> (300, 200)
    // Seg 3: (300, 200) -> (150, 200)
    expect(sim.segments.length).toBe(3);
    expect(sim.targetHit).toBe(true);
    expect(sim.hitElementId).toBe('target-lens');
    expect(sim.collectedStarIds).toContain('star-1');

    expect(sim.segments[0]!.start.x).toBeCloseTo(100, 1);
    expect(sim.segments[0]!.start.y).toBeCloseTo(500, 1);
    expect(sim.segments[0]!.end.x).toBeCloseTo(300, 1);
    expect(sim.segments[0]!.end.y).toBeCloseTo(500, 1);

    expect(sim.segments[1]!.start.x).toBeCloseTo(300, 1);
    expect(sim.segments[1]!.start.y).toBeCloseTo(500, 1);
    expect(sim.segments[1]!.end.x).toBeCloseTo(300, 1);
    expect(sim.segments[1]!.end.y).toBeCloseTo(200, 1);

    expect(sim.segments[2]!.start.x).toBeCloseTo(300, 1);
    expect(sim.segments[2]!.start.y).toBeCloseTo(200, 1);
    expect(sim.segments[2]!.end.x).toBeCloseTo(150, 1);
    expect(sim.segments[2]!.end.y).toBeCloseTo(200, 1);
  });

  it('indica não acerto se o espelho estiver desorientado', () => {
    const source: LightSourceConfig = {
      origin: { x: 100, y: 500 },
      direction: { x: 1, y: 0 },
      color: '#ffd700',
    };

    // Espelho 1 totalmente vertical (angle = PI/2), refletindo o raio de volta para a esquerda
    const mirror1: MirrorConfig = {
      id: 'mirror-1',
      center: { x: 300, y: 500 },
      length: 80,
      angleRad: Math.PI / 2,
      isRotatable: true,
    };

    const targetLens: TargetLensConfig = {
      center: { x: 150, y: 200 },
      radius: 30,
      normalAngleRad: 0,
      acceptanceConeRad: 1.2,
    };

    const sim = simulateOptics(source, [mirror1], targetLens);
    expect(sim.targetHit).toBe(false);
    expect(sim.hitElementId).not.toBe('target-lens');
  });
});
