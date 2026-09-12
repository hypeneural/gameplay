import type {
  ExpressPhotoCandidate,
  ExpressPhotoSelection,
  ExpressPhotoSelectionInput,
} from './ExpressTypes.js';

const DEFAULT_MAX_DISTINCT_PHOTOS = 6;

/**
 * Builds the photo cast without image URLs or browser state. The anchor always comes first;
 * later choices favour the least represented orientation and then the catalog ordering.
 */
export function selectExpressPhotos(input: ExpressPhotoSelectionInput): ExpressPhotoSelection {
  const maxDistinctPhotos = input.maxDistinctPhotos ?? DEFAULT_MAX_DISTINCT_PHOTOS;
  assertCandidate(input.anchor);
  if (!Number.isInteger(maxDistinctPhotos) || maxDistinctPhotos < 1 || maxDistinctPhotos > 6) {
    throw new Error('Expresso requires between one and six distinct photos.');
  }

  const candidates = uniqueCandidates(input.candidates, input.anchor);
  const destinationPhotoIds = [input.anchor.id];
  const remaining = candidates.filter((candidate) => candidate.id !== input.anchor.id);

  while (destinationPhotoIds.length < maxDistinctPhotos && remaining.length > 0) {
    const candidate = selectNextCandidate(remaining, destinationPhotoIds, input);
    destinationPhotoIds.push(candidate.id);
    remaining.splice(
      remaining.findIndex((entry) => entry.id === candidate.id),
      1,
    );
  }

  return { anchorPhotoId: input.anchor.id, destinationPhotoIds };
}

function uniqueCandidates(
  candidates: readonly ExpressPhotoCandidate[],
  anchor: ExpressPhotoCandidate,
): ExpressPhotoCandidate[] {
  const seenIds = new Set<string>();
  const unique: ExpressPhotoCandidate[] = [];
  for (const candidate of [anchor, ...candidates]) {
    assertCandidate(candidate);
    if (seenIds.has(candidate.id)) continue;
    seenIds.add(candidate.id);
    unique.push(candidate);
  }
  return unique;
}

function selectNextCandidate(
  remaining: readonly ExpressPhotoCandidate[],
  selectedIds: readonly string[],
  input: ExpressPhotoSelectionInput,
): ExpressPhotoCandidate {
  const selected = new Set(selectedIds);
  const orientationCounts = new Map<string, number>();
  const catalog = uniqueCandidates(input.candidates, input.anchor);
  for (const candidate of catalog) {
    orientationCounts.set(candidate.orientation, 0);
  }
  for (const selectedId of selected) {
    const candidate = catalog.find((entry) => entry.id === selectedId);
    if (!candidate) continue;
    orientationCounts.set(
      candidate.orientation,
      (orientationCounts.get(candidate.orientation) ?? 0) + 1,
    );
  }

  const minOrientationCount = Math.min(
    ...remaining.map((candidate) => orientationCounts.get(candidate.orientation) ?? 0),
  );
  const byOrientation = remaining.filter(
    (candidate) => (orientationCounts.get(candidate.orientation) ?? 0) === minOrientationCount,
  );
  const firstCatalogPosition = Math.min(
    ...byOrientation.map((candidate) => candidate.catalogPosition),
  );
  const equalPriority = byOrientation.filter(
    (candidate) => candidate.catalogPosition === firstCatalogPosition,
  );
  if (equalPriority.length === 1) return equalPriority[0]!;
  if (!input.random)
    return [...equalPriority].sort((left, right) => left.id.localeCompare(right.id))[0]!;
  return equalPriority[input.random.int(0, equalPriority.length - 1)]!;
}

function assertCandidate(candidate: ExpressPhotoCandidate): void {
  if (candidate.id.trim().length === 0) throw new Error('Expresso photo ids must be non-empty.');
  if (!Number.isInteger(candidate.catalogPosition) || candidate.catalogPosition < 0) {
    throw new Error('Expresso catalog positions must be non-negative integers.');
  }
}
