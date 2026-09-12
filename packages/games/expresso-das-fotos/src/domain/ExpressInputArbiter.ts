import { findExpressStationAt, type ExpressLayout } from './ExpressLayout.js';
import type { ExpressJourney, ExpressStationId } from './ExpressTypes.js';

export interface ExpressInputDecision {
  readonly kind: 'ignored' | 'choose-station';
  readonly stationId?: ExpressStationId;
}

/**
 * Maps one direct primary touch to a semantic station command. No drag or
 * train manipulation is part of the game vocabulary.
 */
export function arbitrateExpressStationTap(
  journey: ExpressJourney,
  layout: ExpressLayout,
  point: Readonly<{ x: number; y: number }>,
  options: Readonly<{ leaving?: boolean }> = {},
): ExpressInputDecision {
  if (options.leaving || journey.phase !== 'awaiting-station') return { kind: 'ignored' };
  const stationId = findExpressStationAt(layout, point.x, point.y);
  return stationId ? { kind: 'choose-station', stationId } : { kind: 'ignored' };
}
