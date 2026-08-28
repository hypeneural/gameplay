import type { Random } from '@christmas-games/platform';

export type MemoryPhotoOrientation = 'portrait' | 'landscape' | 'square';

/** Safe catalog metadata only; URLs and client identity stay in the runtime adapter. */
export interface MemoryPhotoCandidate {
  readonly id: string;
  readonly catalogPosition: number;
  readonly orientation: MemoryPhotoOrientation;
}

export interface MemoryPhotoSelectionInput {
  readonly anchorId: string;
  readonly candidates: readonly MemoryPhotoCandidate[];
  readonly pairCount: number;
  readonly random: Random;
}

/**
 * Keeps the Hub photo as the first pair source, then draws a small, stable
 * subset. The next orientation with the fewest selections is preferred so a
 * mixed catalog does not accidentally become one long strip of portraits.
 */
export function selectMemoryPhotos({
  anchorId,
  candidates,
  pairCount,
  random,
}: MemoryPhotoSelectionInput): readonly MemoryPhotoCandidate[] {
  if (!Number.isInteger(pairCount) || pairCount < 1) return [];

  const uniqueCandidates = new Map<string, MemoryPhotoCandidate>();
  for (const candidate of candidates) {
    if (!uniqueCandidates.has(candidate.id)) uniqueCandidates.set(candidate.id, candidate);
  }
  const anchor = uniqueCandidates.get(anchorId);
  if (!anchor || uniqueCandidates.size < pairCount) return [];

  const selected: MemoryPhotoCandidate[] = [anchor];
  const orientationCounts: Record<MemoryPhotoOrientation, number> = {
    portrait: anchor.orientation === 'portrait' ? 1 : 0,
    landscape: anchor.orientation === 'landscape' ? 1 : 0,
    square: anchor.orientation === 'square' ? 1 : 0,
  };
  const remaining = [...uniqueCandidates.values()]
    .filter((candidate) => candidate.id !== anchor.id)
    .sort((first, second) =>
      first.catalogPosition === second.catalogPosition
        ? first.id.localeCompare(second.id)
        : first.catalogPosition - second.catalogPosition,
    );

  while (selected.length < pairCount) {
    const smallestCount = Math.min(...Object.values(orientationCounts));
    const preferred = remaining.filter(
      (candidate) => orientationCounts[candidate.orientation] === smallestCount,
    );
    const pool = preferred.length > 0 ? preferred : remaining;
    const selectedIndex = random.int(0, pool.length - 1);
    const candidate = pool[selectedIndex]!;
    selected.push(candidate);
    orientationCounts[candidate.orientation] += 1;
    remaining.splice(remaining.indexOf(candidate), 1);
  }

  return selected;
}
