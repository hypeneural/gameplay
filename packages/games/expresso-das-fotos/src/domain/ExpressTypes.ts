import type { Photo, Random } from '@christmas-games/platform';

export const EXPRESS_STATION_IDS = ['station-left', 'station-center', 'station-right'] as const;

export type ExpressStationId = (typeof EXPRESS_STATION_IDS)[number];
export type ExpressRailRouteId = 'north-left' | 'north-center' | 'north-right';
export type ExpressStationAvailability = 'available' | 'closed';
export type ExpressPhotoOrientation = Photo['orientation'];

/** Safe, catalog-derived data used before the runtime asks for an image variant. */
export interface ExpressPhotoCandidate {
  readonly id: string;
  readonly orientation: ExpressPhotoOrientation;
  readonly catalogPosition: number;
}

export interface ExpressPhotoSelection {
  readonly anchorPhotoId: string;
  /** Unique photo ids, always beginning with the anchor. */
  readonly destinationPhotoIds: readonly string[];
}

export interface ExpressPhotoSelectionInput {
  readonly anchor: ExpressPhotoCandidate;
  readonly candidates: readonly ExpressPhotoCandidate[];
  readonly maxDistinctPhotos?: number;
  /** Used only to break an otherwise identical catalog priority. */
  readonly random?: Pick<Random, 'int'>;
}

/**
 * A child sees exactly three station locations. Closed stations retain their
 * physical place, but never impersonate a photo candidate when a small
 * session does not have enough distinct images for three cards.
 */
export interface ExpressStationCandidate {
  readonly stationId: ExpressStationId;
  readonly availability: ExpressStationAvailability;
  readonly photoId?: string;
}

export interface ExpressRouteStop {
  readonly id: string;
  readonly ordinal: number;
  readonly targetPhotoId: string;
  readonly stations: readonly [
    ExpressStationCandidate,
    ExpressStationCandidate,
    ExpressStationCandidate,
  ];
  readonly targetStationIndex: 0 | 1 | 2;
  readonly railRouteId: ExpressRailRouteId;
}

export interface ExpressRoute {
  readonly stops: readonly ExpressRouteStop[];
}

export type ExpressJourneyPhase =
  | 'ready'
  | 'awaiting-station'
  | 'switching-track'
  | 'travelling'
  | 'delivering'
  | 'paused'
  | 'completed';

export type ExpressResumablePhase = Exclude<ExpressJourneyPhase, 'ready' | 'paused' | 'completed'>;

export type ExpressFeedback =
  'none' | 'wrong-station' | 'station-selected' | 'track-switched' | 'delivered';

export interface ExpressJourney {
  readonly route: ExpressRoute;
  readonly phase: ExpressJourneyPhase;
  readonly destinationIndex: number;
  readonly collectedStopIds: readonly string[];
  readonly lastFeedback: ExpressFeedback;
  readonly resumePhase?: ExpressResumablePhase;
}

export type ExpressRejectionReason =
  | 'not-ready'
  | 'not-awaiting-station'
  | 'wrong-station'
  | 'not-switching-track'
  | 'not-travelling'
  | 'not-delivering'
  | 'not-pausable'
  | 'not-paused';

export interface ExpressTransition {
  readonly accepted: boolean;
  readonly state: ExpressJourney;
  readonly rejection?: ExpressRejectionReason;
}
