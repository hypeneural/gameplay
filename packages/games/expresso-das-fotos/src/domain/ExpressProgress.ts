import type { ExpressJourney } from './ExpressTypes.js';

export interface ExpressProgress {
  readonly collectedStops: number;
  readonly totalStops: number;
  readonly completed: boolean;
}

export function getExpressProgress(state: ExpressJourney): ExpressProgress {
  return {
    collectedStops: state.collectedStopIds.length,
    totalStops: state.route.stops.length,
    completed: state.phase === 'completed',
  };
}
