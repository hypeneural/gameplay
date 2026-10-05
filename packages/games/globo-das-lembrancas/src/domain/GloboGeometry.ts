export interface Point {
  x: number;
  y: number;
}

export interface NormalizedRect extends Point {
  width: number;
  height: number;
}

export function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

/**
 * Calculates Euclidean distance from a normalized point to a line segment [from, to],
 * compensating for aspect ratio so circular touch brushes remain circular.
 */
export function photoDistanceToSegment(
  point: Point,
  from: Point,
  to: Point,
  aspect: number,
): number {
  const sx = Math.max(1, aspect);
  const sy = Math.max(1, 1 / aspect);
  const dx = (to.x - from.x) * sx;
  const dy = (to.y - from.y) * sy;
  const px = (point.x - from.x) * sx;
  const py = (point.y - from.y) * sy;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : clamp01((px * dx + py * dy) / length);
  return Math.hypot(px - t * dx, py - t * dy);
}

export function containsPoint(rect: NormalizedRect, point: Point, padding = 0): boolean {
  return (
    point.x >= rect.x - padding &&
    point.x <= rect.x + rect.width + padding &&
    point.y >= rect.y - padding &&
    point.y <= rect.y + rect.height + padding
  );
}
