import type { ExpressRailRouteId } from './ExpressTypes.js';

export interface ExpressNormalizedPoint {
  readonly x: number;
  readonly y: number;
}

export type ExpressRailSegment =
  | Readonly<{ kind: 'line'; to: ExpressNormalizedPoint }>
  | Readonly<{
      kind: 'cubic';
      control1: ExpressNormalizedPoint;
      control2: ExpressNormalizedPoint;
      to: ExpressNormalizedPoint;
    }>;

export interface ExpressRailSpec {
  readonly id: ExpressRailRouteId;
  readonly start: ExpressNormalizedPoint;
  readonly segments: readonly ExpressRailSegment[];
}

/**
 * Pure normalized geometry. Phaser paths are constructed only inside the
 * runtime so this file stays deterministic and portable to test fixtures.
 */
export const EXPRESS_RAIL_SPECS: Readonly<Record<ExpressRailRouteId, ExpressRailSpec>> = {
  'north-left': {
    id: 'north-left',
    start: { x: 0.5, y: 1 },
    segments: [
      {
        kind: 'cubic',
        control1: { x: 0.5, y: 0.72 },
        control2: { x: 0.02, y: 0.63 },
        to: { x: 0, y: 0 },
      },
    ],
  },
  'north-center': {
    id: 'north-center',
    start: { x: 0.5, y: 1 },
    segments: [
      {
        kind: 'cubic',
        control1: { x: 0.5, y: 0.72 },
        control2: { x: 0.5, y: 0.56 },
        to: { x: 0.5, y: 0 },
      },
    ],
  },
  'north-right': {
    id: 'north-right',
    start: { x: 0.5, y: 1 },
    segments: [
      {
        kind: 'cubic',
        control1: { x: 0.5, y: 0.72 },
        control2: { x: 0.98, y: 0.63 },
        to: { x: 1, y: 0 },
      },
    ],
  },
} as const;
