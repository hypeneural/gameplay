export const MOSAIC_MAX_CARD_PHOTOS = 4;
export const MOSAIC_MAX_THUMB_PHOTOS = 6;

export type MosaicPhotoOrientation = 'portrait' | 'landscape' | 'square';

export interface MosaicPhotoCandidate {
  readonly catalogPosition: number;
  readonly id: string;
  readonly orientation: MosaicPhotoOrientation;
}

export interface MosaicPhotoSelection {
  readonly anchorPhotoId: string;
  /** Unique photo ids for board materials, always beginning with the anchor. */
  readonly materialPhotoIds: readonly string[];
  /** Unique card ids for the memory frame, always beginning with the anchor. */
  readonly framePhotoIds: readonly string[];
}

export interface MosaicPhotoSelectionInput {
  readonly anchor: MosaicPhotoCandidate;
  readonly candidates: readonly MosaicPhotoCandidate[];
  readonly maxMaterialPhotos?: number;
}

/**
 * Selects the small, deterministic photo cast before Phaser loads anything.
 * The anchor is mandatory, catalog order is stable and the first pass favours
 * a different orientation when available. URLs and pixels never enter here.
 */
export function planMosaicPhotoSelection(input: MosaicPhotoSelectionInput): MosaicPhotoSelection {
  const maxMaterialPhotos = input.maxMaterialPhotos ?? MOSAIC_MAX_THUMB_PHOTOS;
  if (
    !Number.isInteger(maxMaterialPhotos) ||
    maxMaterialPhotos < 1 ||
    maxMaterialPhotos > MOSAIC_MAX_THUMB_PHOTOS
  ) {
    throw new Error('Mosaico supports between one and six material photos.');
  }
  assertCandidate(input.anchor);

  const candidatesById = new Map<string, MosaicPhotoCandidate>();
  candidatesById.set(input.anchor.id, input.anchor);
  for (const candidate of input.candidates) {
    assertCandidate(candidate);
    if (!candidatesById.has(candidate.id)) candidatesById.set(candidate.id, candidate);
  }
  const ordered = [...candidatesById.values()]
    .filter((candidate) => candidate.id !== input.anchor.id)
    .sort(compareByCatalogPosition);
  const selected: MosaicPhotoCandidate[] = [input.anchor];
  const selectedOrientations = new Set<MosaicPhotoOrientation>([input.anchor.orientation]);

  for (const candidate of ordered) {
    if (selected.length === maxMaterialPhotos) break;
    if (selectedOrientations.has(candidate.orientation)) continue;
    selected.push(candidate);
    selectedOrientations.add(candidate.orientation);
  }
  for (const candidate of ordered) {
    if (selected.length === maxMaterialPhotos) break;
    if (!selected.some((entry) => entry.id === candidate.id)) selected.push(candidate);
  }

  const materialPhotoIds = selected.map((candidate) => candidate.id);
  return {
    anchorPhotoId: input.anchor.id,
    materialPhotoIds,
    framePhotoIds: materialPhotoIds.slice(0, MOSAIC_MAX_CARD_PHOTOS),
  };
}

function compareByCatalogPosition(left: MosaicPhotoCandidate, right: MosaicPhotoCandidate): number {
  return left.catalogPosition === right.catalogPosition
    ? left.id.localeCompare(right.id)
    : left.catalogPosition - right.catalogPosition;
}

function assertCandidate(candidate: MosaicPhotoCandidate): void {
  if (candidate.id.trim().length === 0) throw new Error('Mosaic photo id cannot be empty.');
  if (!Number.isInteger(candidate.catalogPosition) || candidate.catalogPosition < 0) {
    throw new Error('Mosaic photo catalog position must be a non-negative integer.');
  }
}
