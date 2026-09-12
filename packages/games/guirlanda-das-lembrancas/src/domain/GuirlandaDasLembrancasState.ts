/** The deterministic construction state; it has no knowledge of pixels, input or Phaser. */
export type GarlandPhase = 'awaiting-photo' | 'awaiting-slot' | 'completed';

export interface GuirlandaDasLembrancasState {
  readonly photoIds: readonly string[];
  readonly phase: GarlandPhase;
  readonly currentIndex: number;
  readonly mountedBySlot: readonly (string | undefined)[];
}

export interface GarlandTransition {
  readonly accepted: boolean;
  readonly reason?: 'not-awaiting-photo' | 'not-awaiting-slot' | 'slot-unavailable';
  readonly state: GuirlandaDasLembrancasState;
}

/** A mobile wreath has six physical hooks, even when a session supplies fewer memories. */
export const GUIRLANDA_SLOT_COUNT = 6;

export function createGuirlandaDasLembrancasState(
  photoIds: readonly string[],
): GuirlandaDasLembrancasState {
  if (photoIds.length < 1 || photoIds.length > GUIRLANDA_SLOT_COUNT) {
    throw new Error(`Guirlanda requires between 1 and ${GUIRLANDA_SLOT_COUNT} photos.`);
  }
  if (
    new Set(photoIds).size !== photoIds.length ||
    photoIds.some((photoId) => photoId.length === 0)
  ) {
    throw new Error('Guirlanda photo ids must be non-empty and unique.');
  }
  return {
    photoIds: [...photoIds],
    phase: 'awaiting-photo',
    currentIndex: 0,
    mountedBySlot: Array.from({ length: GUIRLANDA_SLOT_COUNT }),
  };
}

export function getCurrentGuirlandaPhotoId(state: GuirlandaDasLembrancasState): string | undefined {
  return state.photoIds[state.currentIndex];
}

/** Selecting the centre memory is the tap equivalent of picking it up to drag. */
export function selectCurrentGuirlandaPhoto(state: GuirlandaDasLembrancasState): GarlandTransition {
  if (state.phase !== 'awaiting-photo') return reject(state, 'not-awaiting-photo');
  return accept({ ...state, phase: 'awaiting-slot' });
}

/** Any free hook is valid: this is a calm construction game, never a matching test. */
export function placeCurrentGuirlandaPhoto(
  state: GuirlandaDasLembrancasState,
  slotIndex: number,
): GarlandTransition {
  if (state.phase !== 'awaiting-slot') return reject(state, 'not-awaiting-slot');
  const currentPhotoId = getCurrentGuirlandaPhotoId(state);
  if (
    currentPhotoId === undefined ||
    !Number.isInteger(slotIndex) ||
    slotIndex < 0 ||
    slotIndex >= GUIRLANDA_SLOT_COUNT ||
    state.mountedBySlot[slotIndex] !== undefined
  ) {
    return reject(state, 'slot-unavailable');
  }
  const mountedBySlot = [...state.mountedBySlot];
  mountedBySlot[slotIndex] = currentPhotoId;
  const isLastPhoto = state.currentIndex === state.photoIds.length - 1;
  return accept({
    ...state,
    mountedBySlot,
    currentIndex: isLastPhoto ? state.currentIndex : state.currentIndex + 1,
    phase: isLastPhoto ? 'completed' : 'awaiting-photo',
  });
}

function accept(state: GuirlandaDasLembrancasState): GarlandTransition {
  return { accepted: true, state };
}

function reject(
  state: GuirlandaDasLembrancasState,
  reason: NonNullable<GarlandTransition['reason']>,
): GarlandTransition {
  return { accepted: false, reason, state };
}
