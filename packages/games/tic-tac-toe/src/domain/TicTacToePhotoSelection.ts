import type { Random } from '@christmas-games/platform';
import type { TicTacToePhotoDescriptor } from './TicTacToeTypes.js';

export const TIC_TAC_TOE_PHOTO_CANDIDATES_PER_PAGE = 6;

export interface SelectTicTacToePhotoCandidatesInput {
  readonly anchor: TicTacToePhotoDescriptor;
  readonly candidates: readonly TicTacToePhotoDescriptor[];
  readonly random: Random;
}

/**
 * Returns only safe descriptors for photo B. Different orientation is presented
 * first when available, while injected randomness keeps a long gallery fresh.
 */
export function selectTicTacToePhotoCandidates({
  anchor,
  candidates,
  random,
}: SelectTicTacToePhotoCandidatesInput): readonly TicTacToePhotoDescriptor[] {
  const unique = new Map<string, TicTacToePhotoDescriptor>();
  for (const candidate of candidates) {
    if (candidate.id !== anchor.id && !unique.has(candidate.id))
      unique.set(candidate.id, candidate);
  }
  const differentOrientation: TicTacToePhotoDescriptor[] = [];
  const matchingOrientation: TicTacToePhotoDescriptor[] = [];
  for (const candidate of unique.values()) {
    if (candidate.orientation === anchor.orientation) matchingOrientation.push(candidate);
    else differentOrientation.push(candidate);
  }
  return [
    ...shuffleTicTacToeCandidates(differentOrientation, random),
    ...shuffleTicTacToeCandidates(matchingOrientation, random),
  ];
}

export function ticTacToePhotoCandidatePage(
  candidates: readonly TicTacToePhotoDescriptor[],
  pageIndex: number,
): readonly TicTacToePhotoDescriptor[] {
  if (!Number.isInteger(pageIndex) || pageIndex < 0) return [];
  const start = pageIndex * TIC_TAC_TOE_PHOTO_CANDIDATES_PER_PAGE;
  return candidates.slice(start, start + TIC_TAC_TOE_PHOTO_CANDIDATES_PER_PAGE);
}

function shuffleTicTacToeCandidates(
  candidates: readonly TicTacToePhotoDescriptor[],
  random: Random,
): readonly TicTacToePhotoDescriptor[] {
  const shuffled = [...candidates];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = random.int(0, index);
    const current = shuffled[index]!;
    shuffled[index] = shuffled[swapIndex]!;
    shuffled[swapIndex] = current;
  }
  return shuffled;
}
