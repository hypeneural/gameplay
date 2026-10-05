import type { Vector2 } from './OpticalModel.js';

export interface PuzzleMirrorConfig {
  id: string;
  name: string;
  /** Normalized position (0 to 1) relative to optical board bounds */
  relPosition: Vector2;
  radius: number;
  initialAngleDeg: number;
  expectedAngleDeg?: number | undefined;
}

export interface StarConfig {
  id: string;
  relPosition: Vector2;
  radius: number;
}

export interface ObstacleConfig {
  id: string;
  relA: Vector2;
  relB: Vector2;
}

export interface PuzzleLevel {
  id: number;
  difficulty: 'iniciante' | 'explorador' | 'mestre';
  name: string;
  hint: string;
  emitter: {
    relPosition: Vector2;
    directionDeg: number;
  };
  targetLens: {
    relPosition: Vector2;
    radius: number;
    normalDeg: number;
  };
  mirrors: PuzzleMirrorConfig[];
  stars: StarConfig[];
  obstacles?: ObstacleConfig[];
}

export const LANTERNA_PUZZLE_LEVELS: readonly PuzzleLevel[] = [
  {
    id: 1,
    difficulty: 'iniciante',
    name: 'O Primeiro Reflexo de Natal',
    hint: 'Gire o espelho de latão para apontar a luz até a lente da Lanterna!',
    emitter: {
      relPosition: { x: 0.15, y: 0.82 },
      directionDeg: 0, // Points horizontally right (towards x: 0.85, y: 0.82)
    },
    targetLens: {
      relPosition: { x: 0.85, y: 0.22 },
      radius: 36,
      normalDeg: 90, // Facing downwards towards mirror
    },
    mirrors: [
      {
        id: 'mirror-1',
        name: 'Espelho de Latão Principal',
        relPosition: { x: 0.85, y: 0.82 },
        radius: 34,
        initialAngleDeg: 0, // Starts horizontal
        expectedAngleDeg: 135, // 135 deg reflects (1, 0) upwards to (0, -1)
      },
    ],
    stars: [
      {
        id: 'star-1',
        relPosition: { x: 0.5, y: 0.82 },
        radius: 18,
      },
      {
        id: 'star-2',
        relPosition: { x: 0.85, y: 0.52 },
        radius: 18,
      },
    ],
  },
  {
    id: 2,
    difficulty: 'explorador',
    name: 'Caminho em Zigue-Zague Estelar',
    hint: 'Use os dois espelhos de latão para contornar o caminho e coletar as estrelas!',
    emitter: {
      relPosition: { x: 0.15, y: 0.85 },
      directionDeg: -90, // Points upwards to (0.15, 0.45)
    },
    targetLens: {
      relPosition: { x: 0.85, y: 0.18 },
      radius: 36,
      normalDeg: 90, // Facing downwards
    },
    mirrors: [
      {
        id: 'mirror-1',
        name: 'Espelho Ocidental',
        relPosition: { x: 0.15, y: 0.45 },
        radius: 34,
        initialAngleDeg: 0,
        expectedAngleDeg: 45, // Reflects (0, -1) right to (1, 0)
      },
      {
        id: 'mirror-2',
        name: 'Espelho Oriental',
        relPosition: { x: 0.85, y: 0.45 },
        radius: 34,
        initialAngleDeg: 90,
        expectedAngleDeg: 135, // Reflects (1, 0) upwards to (0, -1)
      },
    ],
    stars: [
      {
        id: 'star-1',
        relPosition: { x: 0.15, y: 0.65 },
        radius: 18,
      },
      {
        id: 'star-2',
        relPosition: { x: 0.5, y: 0.45 },
        radius: 18,
      },
      {
        id: 'star-3',
        relPosition: { x: 0.85, y: 0.32 },
        radius: 18,
      },
    ],
  },
  {
    id: 3,
    difficulty: 'mestre',
    name: 'A Trilogia de Prata e Ouro',
    hint: 'Três espelhos trabalham juntos para levar a luz encantada ao topo!',
    emitter: {
      relPosition: { x: 0.2, y: 0.85 },
      directionDeg: 0, // Points right towards (0.8, 0.85)
    },
    targetLens: {
      relPosition: { x: 0.5, y: 0.18 },
      radius: 36,
      normalDeg: 90, // Facing downwards
    },
    mirrors: [
      {
        id: 'mirror-1',
        name: 'Primeiro Espelho',
        relPosition: { x: 0.8, y: 0.85 },
        radius: 34,
        initialAngleDeg: 45,
        expectedAngleDeg: 135, // Reflects right to up (0.8, 0.5)
      },
      {
        id: 'mirror-2',
        name: 'Segundo Espelho',
        relPosition: { x: 0.8, y: 0.5 },
        radius: 34,
        initialAngleDeg: 0,
        expectedAngleDeg: 45, // Reflects up to left (0.2, 0.5)
      },
      {
        id: 'mirror-3',
        name: 'Terceiro Espelho',
        relPosition: { x: 0.5, y: 0.5 },
        radius: 34,
        initialAngleDeg: 90,
        expectedAngleDeg: 135, // Reflects right to up towards (0.5, 0.18)
      },
    ],
    stars: [
      {
        id: 'star-1',
        relPosition: { x: 0.5, y: 0.85 },
        radius: 18,
      },
      {
        id: 'star-2',
        relPosition: { x: 0.8, y: 0.68 },
        radius: 18,
      },
      {
        id: 'star-3',
        relPosition: { x: 0.5, y: 0.32 },
        radius: 18,
      },
    ],
  },
];

export function getLevelById(id: number): PuzzleLevel {
  const level = LANTERNA_PUZZLE_LEVELS.find((l) => l.id === id);
  return level ?? LANTERNA_PUZZLE_LEVELS[0]!;
}

export function computeOptimalMirrorAngle(
  level: PuzzleLevel,
  mirrorId: string,
): number | undefined {
  const mirror = level.mirrors.find((m) => m.id === mirrorId);
  return mirror?.expectedAngleDeg;
}

export function findNextMisalignedMirror(
  level: PuzzleLevel,
  currentAngles: ReadonlyMap<string, number>,
): { readonly mirrorId: string; readonly targetAngle: number } | undefined {
  for (const mirror of level.mirrors) {
    if (mirror.expectedAngleDeg !== undefined) {
      const current = currentAngles.get(mirror.id) ?? mirror.initialAngleDeg;
      const normalizedCurrent = ((current % 180) + 180) % 180;
      const normalizedExpected = ((mirror.expectedAngleDeg % 180) + 180) % 180;
      if (Math.abs(normalizedCurrent - normalizedExpected) > 4) {
        return { mirrorId: mirror.id, targetAngle: mirror.expectedAngleDeg };
      }
    }
  }
  return undefined;
}
