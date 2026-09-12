import type { Random } from '@christmas-games/platform';

import {
  EXPRESS_STATION_IDS,
  type ExpressRailRouteId,
  type ExpressRoute,
  type ExpressStationCandidate,
  type ExpressStationId,
} from './ExpressTypes.js';

const MAXIMUM_ROUTE_STOPS = 6;

/**
 * Creates the replayable photo-matching itinerary. Each stop has one matching
 * photo and up to two distinct distractors; a small photo session uses closed
 * stations rather than duplicating a target and making the rule ambiguous.
 */
export function createExpressRoute(
  destinationPhotoIds: readonly string[],
  random: Pick<Random, 'int'>,
  stopCount = MAXIMUM_ROUTE_STOPS,
): ExpressRoute {
  assertPhotoIds(destinationPhotoIds);
  if (!Number.isInteger(stopCount) || stopCount < 1 || stopCount > MAXIMUM_ROUTE_STOPS) {
    throw new Error('Expresso route needs between one and six stops.');
  }

  const stops = [] as ExpressRoute['stops'][number][];
  for (let index = 0; index < stopCount; index += 1) {
    const targetStationIndex = selectTargetStationIndex(stops, random);
    const targetPhotoId = destinationPhotoIds[index % destinationPhotoIds.length]!;
    const stations = createStationCandidates(
      targetPhotoId,
      destinationPhotoIds,
      targetStationIndex,
      random,
    );
    stops.push({
      id: `stop-${index + 1}`,
      ordinal: index + 1,
      targetPhotoId,
      stations,
      targetStationIndex,
      railRouteId: railRouteFor(stations[targetStationIndex].stationId),
    });
  }
  return { stops };
}

function createStationCandidates(
  targetPhotoId: string,
  photoIds: readonly string[],
  targetStationIndex: 0 | 1 | 2,
  random: Pick<Random, 'int'>,
): ExpressRoute['stops'][number]['stations'] {
  const distractors = shuffled(
    photoIds.filter((photoId) => photoId !== targetPhotoId),
    random,
  ).slice(0, 2);
  let distractorCursor = 0;
  const stations = EXPRESS_STATION_IDS.map((stationId, index): ExpressStationCandidate => {
    if (index === targetStationIndex) {
      return { stationId, availability: 'available', photoId: targetPhotoId };
    }
    const photoId = distractors[distractorCursor];
    distractorCursor += 1;
    return photoId
      ? { stationId, availability: 'available', photoId }
      : { stationId, availability: 'closed' };
  });
  return [stations[0]!, stations[1]!, stations[2]!];
}

function selectTargetStationIndex(
  stops: readonly ExpressRoute['stops'][number][],
  random: Pick<Random, 'int'>,
): 0 | 1 | 2 {
  const lastTwo = stops.slice(-2);
  const repeatedIndex =
    lastTwo.length === 2 && lastTwo[0]!.targetStationIndex === lastTwo[1]!.targetStationIndex
      ? lastTwo[0]!.targetStationIndex
      : undefined;
  const options = ([0, 1, 2] as const).filter((index) => index !== repeatedIndex);
  return options[random.int(0, options.length - 1)]!;
}

function railRouteFor(stationId: ExpressStationId): ExpressRailRouteId {
  if (stationId === 'station-left') return 'north-left';
  if (stationId === 'station-center') return 'north-center';
  return 'north-right';
}

function shuffled<T>(entries: readonly T[], random: Pick<Random, 'int'>): T[] {
  const remaining = [...entries];
  const shuffledEntries: T[] = [];
  while (remaining.length > 0) {
    const index = random.int(0, remaining.length - 1);
    shuffledEntries.push(remaining.splice(index, 1)[0]!);
  }
  return shuffledEntries;
}

function assertPhotoIds(destinationPhotoIds: readonly string[]): void {
  if (
    destinationPhotoIds.length === 0 ||
    destinationPhotoIds.some((id) => id.trim().length === 0)
  ) {
    throw new Error('Expresso route needs at least one non-empty photo id.');
  }
  if (new Set(destinationPhotoIds).size !== destinationPhotoIds.length) {
    throw new Error('Expresso route needs distinct photo ids.');
  }
}
