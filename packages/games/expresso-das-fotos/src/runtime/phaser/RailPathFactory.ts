import type { ExpressLayout } from '../../domain/ExpressLayout.js';
import {
  EXPRESS_RAIL_SPECS,
  type ExpressNormalizedPoint,
} from '../../domain/ExpressRailGeometry.js';
import type { ExpressRailRouteId } from '../../domain/ExpressTypes.js';
import type * as PhaserModule from 'phaser';

export interface RuntimeRailPath {
  readonly id: ExpressRailRouteId;
  readonly path: PhaserModule.Curves.Path;
  readonly lengthPx: number;
}

/**
 * Turns deterministic normalized rail specs into short-lived Phaser Paths.
 * The factory is runtime-only: no Phaser values cross into the game domain.
 */
export function createRuntimeRailPaths(
  Phaser: typeof PhaserModule,
  layout: ExpressLayout,
): Readonly<Record<ExpressRailRouteId, RuntimeRailPath>> {
  return {
    'north-left': createRuntimeRailPath(Phaser, 'north-left', layout),
    'north-center': createRuntimeRailPath(Phaser, 'north-center', layout),
    'north-right': createRuntimeRailPath(Phaser, 'north-right', layout),
  };
}

function createRuntimeRailPath(
  Phaser: typeof PhaserModule,
  id: ExpressRailRouteId,
  layout: ExpressLayout,
): RuntimeRailPath {
  const spec = EXPRESS_RAIL_SPECS[id];
  const left = layout.stations['station-left'];
  const right = layout.stations['station-right'];
  /**
   * Rails arrive at the platform below a photo card. This keeps the real
   * locomotive readable throughout the motion instead of covering the answer
   * at the moment it should be celebrated.
   */
  const stationY = left.y + left.height + 24;
  const startY = layout.trainHome.y;
  const mapPoint = (point: ExpressNormalizedPoint): Readonly<{ x: number; y: number }> => ({
    x: left.x + left.width / 2 + point.x * (right.x + right.width / 2 - (left.x + left.width / 2)),
    y: stationY + point.y * (startY - stationY),
  });
  const start = mapPoint(spec.start);
  const path = new Phaser.Curves.Path(start.x, start.y);
  for (const segment of spec.segments) {
    if (segment.kind === 'line') {
      const to = mapPoint(segment.to);
      path.lineTo(to.x, to.y);
      continue;
    }
    const to = mapPoint(segment.to);
    const control1 = mapPoint(segment.control1);
    const control2 = mapPoint(segment.control2);
    path.cubicBezierTo(to.x, to.y, control1.x, control1.y, control2.x, control2.y);
  }
  return { id, path, lengthPx: path.getLength() };
}
