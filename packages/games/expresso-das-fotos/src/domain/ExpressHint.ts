import { getCurrentExpressStop } from './ExpressJourney.js';
import type { ExpressJourney, ExpressStationId } from './ExpressTypes.js';

export interface ExpressHint {
  readonly stationId: ExpressStationId;
  readonly photoId: string;
}

/** The runtime reveals this only after an idle delay; it never advances the domain. */
export function getExpressHint(state: ExpressJourney): ExpressHint | undefined {
  if (state.phase !== 'awaiting-station') return undefined;
  const stop = getCurrentExpressStop(state);
  const target = stop?.stations[stop.targetStationIndex];
  return stop && target ? { stationId: target.stationId, photoId: stop.targetPhotoId } : undefined;
}
