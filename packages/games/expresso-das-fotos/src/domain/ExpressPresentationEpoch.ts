export interface ExpressPresentationEpoch {
  readonly value: number;
  readonly nextToken: number;
  readonly trackSwitchToken?: number;
  readonly arrivalToken?: number;
  readonly collectionToken?: number;
}

export const EXPRESS_INITIAL_PRESENTATION_EPOCH: ExpressPresentationEpoch = {
  value: 0,
  nextToken: 1,
};

/** Invalidating before cancelling a visual handle makes delayed callbacks harmless. */
export function invalidateExpressPresentation(
  state: ExpressPresentationEpoch,
): ExpressPresentationEpoch {
  return { value: state.value + 1, nextToken: state.nextToken };
}

export function issueExpressArrivalToken(state: ExpressPresentationEpoch): {
  readonly state: ExpressPresentationEpoch;
  readonly token: number;
} {
  const token = state.nextToken;
  return { state: { ...state, arrivalToken: token, nextToken: token + 1 }, token };
}

export function issueExpressTrackSwitchToken(state: ExpressPresentationEpoch): {
  readonly state: ExpressPresentationEpoch;
  readonly token: number;
} {
  const token = state.nextToken;
  return { state: { ...state, trackSwitchToken: token, nextToken: token + 1 }, token };
}

export function ownsExpressTrackSwitchToken(
  state: ExpressPresentationEpoch,
  token: number,
): boolean {
  return state.trackSwitchToken === token;
}

export function issueExpressCollectionToken(state: ExpressPresentationEpoch): {
  readonly state: ExpressPresentationEpoch;
  readonly token: number;
} {
  const token = state.nextToken;
  return { state: { ...state, collectionToken: token, nextToken: token + 1 }, token };
}

export function ownsExpressArrivalToken(state: ExpressPresentationEpoch, token: number): boolean {
  return state.arrivalToken === token;
}

export function ownsExpressCollectionToken(
  state: ExpressPresentationEpoch,
  token: number,
): boolean {
  return state.collectionToken === token;
}
