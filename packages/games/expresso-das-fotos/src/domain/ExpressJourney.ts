import type {
  ExpressJourney,
  ExpressRejectionReason,
  ExpressResumablePhase,
  ExpressRoute,
  ExpressRouteStop,
  ExpressStationId,
  ExpressTransition,
} from './ExpressTypes.js';

export function createExpressJourney(route: ExpressRoute): ExpressJourney {
  assertRoute(route);
  return {
    route,
    phase: 'ready',
    destinationIndex: 0,
    collectedStopIds: [],
    lastFeedback: 'none',
  };
}

export function startExpressJourney(state: ExpressJourney): ExpressTransition {
  if (state.phase !== 'ready') return reject(state, 'not-ready');
  return accept({ ...state, phase: 'awaiting-station', lastFeedback: 'none' });
}

/**
 * The sole primary command. Selecting a wrong or closed station gives gentle
 * feedback without consuming a delivery; only the matching photo moves on.
 */
export function chooseExpressStation(
  state: ExpressJourney,
  stationId: ExpressStationId,
): ExpressTransition {
  if (state.phase !== 'awaiting-station') return reject(state, 'not-awaiting-station');
  const stop = getCurrentExpressStop(state);
  const station = stop?.stations.find((candidate) => candidate.stationId === stationId);
  if (
    !stop ||
    !station ||
    station.availability !== 'available' ||
    station.photoId !== stop.targetPhotoId
  ) {
    return reject({ ...state, lastFeedback: 'wrong-station' }, 'wrong-station');
  }
  return accept({ ...state, phase: 'switching-track', lastFeedback: 'station-selected' });
}

/** Called only after the switch animation has visibly locked onto the chosen rail. */
export function finishExpressTrackSwitch(state: ExpressJourney): ExpressTransition {
  if (state.phase !== 'switching-track') return reject(state, 'not-switching-track');
  return accept({ ...state, phase: 'travelling', lastFeedback: 'track-switched' });
}

/** Called by the runtime after the path-following train visibly reaches its station. */
export function arriveAtExpressStation(state: ExpressJourney): ExpressTransition {
  if (state.phase !== 'travelling') return reject(state, 'not-travelling');
  return accept({ ...state, phase: 'delivering' });
}

/** Called after the memory is visibly added to the tree. */
export function deliverExpressMemory(state: ExpressJourney): ExpressTransition {
  if (state.phase !== 'delivering') return reject(state, 'not-delivering');
  const stop = getCurrentExpressStop(state);
  if (!stop) return reject(state, 'not-delivering');

  const collectedStopIds = [...state.collectedStopIds, stop.id];
  const nextDestinationIndex = state.destinationIndex + 1;
  const completed = nextDestinationIndex >= state.route.stops.length;
  return accept({
    ...state,
    destinationIndex: nextDestinationIndex,
    collectedStopIds,
    phase: completed ? 'completed' : 'awaiting-station',
    lastFeedback: 'delivered',
  });
}

export function pauseExpressJourney(state: ExpressJourney): ExpressTransition {
  if (!isResumablePhase(state.phase)) return reject(state, 'not-pausable');
  return accept({ ...state, phase: 'paused', resumePhase: state.phase });
}

export function resumeExpressJourney(state: ExpressJourney): ExpressTransition {
  if (state.phase !== 'paused' || !state.resumePhase) return reject(state, 'not-paused');
  const { resumePhase, ...rest } = state;
  return accept({ ...rest, phase: resumePhase });
}

export function getCurrentExpressStop(state: ExpressJourney): ExpressRouteStop | undefined {
  return state.route.stops[state.destinationIndex];
}

function assertRoute(route: ExpressRoute): void {
  if (route.stops.length === 0) throw new Error('Expresso journey needs at least one route stop.');
  const ids = new Set<string>();
  for (const stop of route.stops) {
    if (
      stop.id.trim().length === 0 ||
      stop.targetPhotoId.trim().length === 0 ||
      ids.has(stop.id) ||
      stop.stations.length !== 3
    ) {
      throw new Error('Expresso route stops need unique ids, target photos and three stations.');
    }
    const stationIds = new Set(stop.stations.map((station) => station.stationId));
    const target = stop.stations[stop.targetStationIndex];
    if (
      stationIds.size !== 3 ||
      !target ||
      target.photoId !== stop.targetPhotoId ||
      target.availability !== 'available'
    ) {
      throw new Error('Expresso route stop needs exactly one reachable target station.');
    }
    ids.add(stop.id);
  }
}

function isResumablePhase(phase: ExpressJourney['phase']): phase is ExpressResumablePhase {
  return (
    phase === 'awaiting-station' ||
    phase === 'switching-track' ||
    phase === 'travelling' ||
    phase === 'delivering'
  );
}

function accept(state: ExpressJourney): ExpressTransition {
  return { accepted: true, state };
}

function reject(state: ExpressJourney, rejection: ExpressRejectionReason): ExpressTransition {
  return { accepted: false, state, rejection };
}
