import { containsPoint, photoDistanceToSegment } from './PhotoGeometry.js';
import type { NormalizedRect, Point } from './PhotoGeometry.js';

export type MagicEffect = 'star' | 'snow' | 'lights' | 'santa' | 'wonder';
export interface Hotspot extends Point {
  id: number;
  radius: number;
  effect: MagicEffect;
  discovered: boolean;
}

const anchors: readonly Point[] = [
  { x: 0.13, y: 0.19 },
  { x: 0.87, y: 0.26 },
  { x: 0.13, y: 0.66 },
  { x: 0.86, y: 0.81 },
  { x: 0.48, y: 0.89 },
  { x: 0.5, y: 0.09 },
  { x: 0.91, y: 0.51 },
  { x: 0.08, y: 0.42 },
  { x: 0.35, y: 0.93 },
];
const effects: readonly MagicEffect[] = ['star', 'snow', 'lights', 'santa', 'wonder'];

/** The seed only mirrors a dispersed layout. Optional subject metadata moves effects outward. */
export function createHotspots(seed: number, safeZone?: NormalizedRect): Hotspot[] {
  const candidates = anchors.map((point) => ({ ...point, x: seed % 2 ? 1 - point.x : point.x }));
  const safe = candidates.filter((point) => !safeZone || !containsPoint(safeZone, point, 0.025));
  // Unusual metadata covering the entire photo cannot make the game impossible.
  const ordered = [...safe, ...candidates.filter((point) => !safe.includes(point))];
  return ordered
    .slice(0, 5)
    .map((point, id) => ({ ...point, id, radius: 0.115, effect: effects[id]!, discovered: false }));
}

export function hitHotspots(
  hotspots: readonly Hotspot[],
  from: Point,
  to: Point,
  aspect: number,
): Hotspot[] {
  return hotspots.filter(
    (point) => !point.discovered && photoDistanceToSegment(point, from, to, aspect) <= point.radius,
  );
}
